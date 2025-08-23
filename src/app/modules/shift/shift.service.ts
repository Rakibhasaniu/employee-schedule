/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { TShift, TShiftCoverage, TEmployeeWorkload, TConflictAnalysis } from './shift.interface';
import { Shift } from './shift.model';
import { Employee } from '../employee/employee.model';
import { TimeOffRequest } from '../timeOff/timeOff.model';

const createShiftIntoDB = async (payload: TShift & { createdBy: string }) => {
  // Validate employee exists
  const employee = await Employee.findById(payload.employee);
  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  // Check if employee is available on the given date
  const shiftDate = new Date(payload.date);
  const dayOfWeek = shiftDate.toLocaleDateString('en-US', { 
    weekday: 'long' 
  }).toLowerCase() as keyof typeof employee.availability;
  
  if (!employee.availability[dayOfWeek]?.available) {
    throw new AppError(
      httpStatus.BAD_REQUEST, 
      `Employee is not available on ${dayOfWeek}`
    );
  }

  // Check for approved time-off conflicts - FIXED: Use TimeOffRequest instead of TimeOf
  const timeOffConflict = await TimeOffRequest.findOne({
    employee: payload.employee,
    status: 'approved',
    startDate: { $lte: shiftDate },
    endDate: { $gte: shiftDate }
  });

  if (timeOffConflict) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Employee has approved time-off on this date'
    );
  }

  // Check for shift conflicts using aggregation
  const conflicts = await detectShiftConflicts(payload);
  if (conflicts.length > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Shift conflicts detected: ${conflicts.map(c => c.description).join(', ')}`
    );
  }

  const result = await Shift.create(payload);
  return result;
};

const getAllShiftsFromDB = async (query: Record<string, unknown>) => {
  const shiftSearchableFields = ['role', 'location', 'notes'];

  const shiftQuery = new QueryBuilder(
    Shift.find()
      .populate('employee', 'id name email role department')
      .populate('scheduleId', 'title weekStartDate weekEndDate')
      .populate('createdBy', 'id email role'),
    query,
  )
    .search(shiftSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await shiftQuery.modelQuery;
  const meta = await shiftQuery.countTotal();

  return { result, meta };
};

const getSingleShiftFromDB = async (id: string) => {
  const result = await Shift.findById(id)
    .populate('employee', 'id name email role department location availability')
    .populate('scheduleId', 'title weekStartDate weekEndDate status')
    .populate('createdBy', 'id email role');

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift not found');
  }

  return result;
};

const updateShiftIntoDB = async (id: string, payload: Partial<TShift>) => {
  const shift = await Shift.findById(id);
  if (!shift) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift not found');
  }

  if (shift.status === 'completed') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot modify a completed shift'
    );
  }

  // If updating employee or time, check for conflicts
  if (payload.employee || payload.date || payload.startTime || payload.endTime) {
    const updatedShift = { ...shift.toObject(), ...payload };
    const conflicts = await detectShiftConflicts(updatedShift as TShift, id);
    
    if (conflicts.length > 0) {
      throw new AppError(
        httpStatus.CONFLICT,
        `Update would create conflicts: ${conflicts.map(c => c.description).join(', ')}`
      );
    }
  }

  const result = await Shift.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate('employee', 'id name email role department')
    .populate('scheduleId', 'title weekStartDate weekEndDate');

  return result;
};

const deleteShiftFromDB = async (id: string) => {
  const shift = await Shift.findById(id);
  if (!shift) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift not found');
  }

  if (shift.status === 'in-progress' || shift.status === 'completed') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot delete a shift that is in-progress or completed'
    );
  }

  const result = await Shift.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  return result;
};

// MongoDB Aggregation Pipelines

const getShiftCoverageByDateRange = async (
  startDate: string, 
  endDate: string, 
  location?: string
): Promise<TShiftCoverage[]> => {
  const matchStage: mongoose.FilterQuery<any> = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    status: { $ne: 'cancelled' }
  };

  if (location) {
    matchStage.location = location;
  }

  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeInfo'
      }
    },
    { $unwind: '$employeeInfo' },
    {
      $addFields: {
        duration: {
          $divide: [
            {
              $subtract: [
                { $dateFromString: { dateString: { $concat: ['1970-01-01T', '$endTime', ':00'] } } },
                { $dateFromString: { dateString: { $concat: ['1970-01-01T', '$startTime', ':00'] } } }
              ]
            },
            1000 * 60 * 60 // Convert to hours
          ]
        }
      }
    },
    {
      $group: {
        _id: {
          location: '$location',
          date: '$date'
        },
        totalShifts: { $sum: 1 },
        totalHours: { $sum: '$duration' },
        roleBreakdown: {
          $push: {
            role: '$role',
            employee: {
              id: '$employeeInfo.id',
              name: { $concat: ['$employeeInfo.name.firstName', ' ', '$employeeInfo.name.lastName'] }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.location',
        dates: {
          $push: {
            date: '$_id.date',
            totalShifts: '$totalShifts',
            totalHours: '$totalHours',
            roleBreakdown: '$roleBreakdown'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        location: '$_id',
        dates: 1
      }
    },
    { 
      $sort: { location: 1 as const } 
    }
  ];

  const result = await Shift.aggregate(pipeline);
  return result;
};

const getEmployeeWorkloadAnalysis = async (
  startDate: string,
  endDate: string,
  employeeId?: string
): Promise<TEmployeeWorkload[]> => {
  const matchStage: mongoose.FilterQuery<any> = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    status: { $ne: 'cancelled' }
  };

  if (employeeId) {
    matchStage.employee = new mongoose.Types.ObjectId(employeeId);
  }

  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeInfo'
      }
    },
    { $unwind: '$employeeInfo' },
    {
      $addFields: {
        duration: {
          $divide: [
            {
              $subtract: [
                { $dateFromString: { dateString: { $concat: ['1970-01-01T', '$endTime', ':00'] } } },
                { $dateFromString: { dateString: { $concat: ['1970-01-01T', '$startTime', ':00'] } } }
              ]
            },
            1000 * 60 * 60
          ]
        }
      }
    },
    {
      $group: {
        _id: '$employee',
        employee: { $first: '$employeeInfo' },
        totalShifts: { $sum: 1 },
        totalHours: { $sum: '$duration' },
        shiftTypes: {
          $push: '$shiftType'
        },
        uniqueDays: { $addToSet: '$date' }
      }
    },
    {
      $addFields: {
        avgHoursPerDay: {
          $divide: ['$totalHours', { $size: '$uniqueDays' }]
        },
        shiftTypeBreakdown: {
          $arrayToObject: {
            $map: {
              input: ['morning', 'afternoon', 'night', 'full-day'],
              as: 'type',
              in: {
                k: '$$type',
                v: {
                  $size: {
                    $filter: {
                      input: '$shiftTypes',
                      cond: { $eq: ['$$this', '$$type'] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        employee: {
          _id: '$employee._id',
          name: { $concat: ['$employee.name.firstName', ' ', '$employee.name.lastName'] },
          email: '$employee.email'
        },
        totalShifts: 1,
        totalHours: { $round: ['$totalHours', 2] },
        avgHoursPerDay: { $round: ['$avgHoursPerDay', 2] },
        shiftTypes: '$shiftTypeBreakdown'
      }
    },
    { 
      $sort: { totalHours: -1 as const } 
    }
  ];

  const result = await Shift.aggregate(pipeline);
  return result;
};

const detectConflictsWithAggregation = async (
  startDate: string,
  endDate: string
): Promise<TConflictAnalysis[]> => {
  const pipeline = [
    {
      $match: {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        status: { $in: ['scheduled', 'in-progress'] }
      }
    },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeInfo'
      }
    },
    { $unwind: '$employeeInfo' },
    {
      $group: {
        _id: {
          employee: '$employee',
          date: '$date'
        },
        employeeName: { $first: { $concat: ['$employeeInfo.name.firstName', ' ', '$employeeInfo.name.lastName'] } },
        shifts: {
          $push: {
            shiftId: '$_id',
            startTime: '$startTime',
            endTime: '$endTime',
            location: '$location'
          }
        }
      }
    },
    {
      $match: {
        'shifts.1': { $exists: true } // Only employees with multiple shifts on same date
      }
    },
    {
      $addFields: {
        conflicts: {
          $map: {
            input: { $range: [0, { $size: '$shifts' }] },
            as: 'i',
            in: {
              $map: {
                input: { $range: [{ $add: ['$$i', 1] }, { $size: '$shifts' }] },
                as: 'j',
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $lt: [{ $dateFromString: { dateString: { $concat: ['1970-01-01T', { $arrayElemAt: ['$shifts.startTime', '$$i'] }] } } }, { $dateFromString: { dateString: { $concat: ['1970-01-01T', { $arrayElemAt: ['$shifts.endTime', '$$j'] }] } } }] },
                        { $gt: [{ $dateFromString: { dateString: { $concat: ['1970-01-01T', { $arrayElemAt: ['$shifts.endTime', '$$i'] }] } } }, { $dateFromString: { dateString: { $concat: ['1970-01-01T', { $arrayElemAt: ['$shifts.startTime', '$$j'] }] } } }] }
                      ]
                    },
                    then: {
                      shift1: { $arrayElemAt: ['$shifts', '$$i'] },
                      shift2: { $arrayElemAt: ['$shifts', '$$j'] }
                    },
                    else: null
                  }
                }
              }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        employeeId: '$_id.employee',
        employeeName: 1,
        conflictType: 'overlap',
        conflictDate: '$_id.date',
        overlappingShifts: {
          $reduce: {
            input: '$conflicts',
            initialValue: [],
            in: {
              $concatArrays: [
                '$$value',
                {
                  $filter: {
                    input: '$$this',
                    cond: { $ne: ['$$this', null] }
                  }
                }
              ]
            }
          }
        }
      }
    },
    {
      $match: {
        'overlappingShifts.0': { $exists: true }
      }
    }
  ];

  const result = await Shift.aggregate(pipeline);
  return result;
};

const getShiftsByEmployee = async (employeeId: string, startDate: string, endDate: string) => {
  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        employee: new mongoose.Types.ObjectId(employeeId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $lookup: {
        from: 'schedules',
        localField: 'scheduleId',
        foreignField: '_id',
        as: 'scheduleInfo'
      }
    },
    { $unwind: '$scheduleInfo' },
    {
      $addFields: {
        duration: {
          $divide: [
            {
              $subtract: [
                { $dateFromString: { dateString: { $concat: ['1970-01-01T', '$endTime', ':00'] } } },
                { $dateFromString: { dateString: { $concat: ['1970-01-01T', '$startTime', ':00'] } } }
              ]
            },
            1000 * 60 * 60
          ]
        }
      }
    },
    {
      $sort: { date: 1 as const, startTime: 1 as const }
    }
  ];

  const result = await Shift.aggregate(pipeline);
  return result;
};

// Helper function to detect shift conflicts
const detectShiftConflicts = async (shiftData: TShift, excludeShiftId?: string): Promise<any[]> => {
  const matchStage: any = {
    employee: shiftData.employee,
    date: shiftData.date,
    status: { $ne: 'cancelled' }
  };

  if (excludeShiftId) {
    matchStage._id = { $ne: new mongoose.Types.ObjectId(excludeShiftId) };
  }

  const conflicts = await Shift.find(matchStage);
  
  const overlappingShifts = conflicts.filter(existingShift => {
    return isTimeOverlap(
      existingShift.startTime,
      existingShift.endTime,
      shiftData.startTime,
      shiftData.endTime
    );
  });

  return overlappingShifts.map(shift => ({
    type: 'overlap',
    description: `Overlapping shift from ${shift.startTime} to ${shift.endTime}`,
    conflictingShiftId: shift._id
  }));
};

const isTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const s1 = new Date(`1970-01-01T${start1}`);
  const e1 = new Date(`1970-01-01T${end1}`);
  const s2 = new Date(`1970-01-01T${start2}`);
  const e2 = new Date(`1970-01-01T${end2}`);

  return s1 < e2 && e1 > s2;
};

export const ShiftServices = {
  createShiftIntoDB,
  getAllShiftsFromDB,
  getSingleShiftFromDB,
  updateShiftIntoDB,
  deleteShiftFromDB,
  getShiftCoverageByDateRange,
  getEmployeeWorkloadAnalysis,
  detectConflictsWithAggregation,
  getShiftsByEmployee,
};