/* eslint-disable @typescript-eslint/no-explicit-any */


import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Employee } from '../employee/employee.model';
import { Schedule } from '../schedule/schedule.model';
import { ICreateTimeOffRequest, IEmployeeTimeOffSummary, IReviewTimeOffRequest, ITimeOffAnalytics, ITimeOffQuery, IUpdateTimeOffRequest, TTimeOffBalance, TTimeOffRequest } from './timeOff.interface';
import { TimeOffBalance, TimeOffPolicy, TimeOffRequest } from './timeOff.model';
import { TIME_OFF_SEARCHABLE_FIELDS, TIME_OFF_STATUS, TIME_OFF_TYPE } from './timeOff.constant';



const createTimeOffRequestIntoDB = async (
  payload: ICreateTimeOffRequest,
  requestedBy: string
): Promise<TTimeOffRequest> => {
  const employee = await Employee.findOne({ id: requestedBy });
  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);
  const timeDiff = endDate.getTime() - startDate.getTime();
  const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

  const balance = await getOrCreateEmployeeBalance(employee._id.toString());
  const typeBalance = balance[payload.type as keyof typeof balance] as any;
  
  if (typeBalance && typeof typeBalance === 'object' && typeBalance.remaining < totalDays) {
    if (!payload.isEmergency) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient ${payload.type} balance. Remaining: ${typeBalance.remaining} days`
      );
    }
  }

  const conflictingShifts = await Schedule.aggregate([
    {
      $match: {
        'shifts.employee': employee._id,
        $or: [
          {
            'shifts.date': {
              $gte: startDate,
              $lte: endDate
            }
          }
        ],
        status: { $in: ['published', 'completed'] }
      }
    },
    {
      $unwind: '$shifts'
    },
    {
      $match: {
        'shifts.employee': employee._id,
        'shifts.date': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $project: {
        _id: 1,
        shift: '$shifts'
      }
    }
  ]);

  const timeOffData = {
    ...payload,
    employee: employee._id,
    requestedBy: employee._id,
    startDate,
    endDate,
    totalDays,
    conflictingShifts: conflictingShifts.map(shift => shift._id),
  };

  const result = await TimeOffRequest.create(timeOffData);
  
  await updateEmployeeBalance(employee._id.toString(), payload.type, totalDays, 'pending');

  return result;
};
const getAllTimeOffRequestsFromDB = async (query: Record<string, unknown>) => {
  console.log('Incoming query:', query);
  
  // Create base query
  let baseQuery = TimeOffRequest.find()
    .populate({
      path: 'employee',
      select: 'id name email department',
      model: 'Employee'
    })
    .populate({
      path: 'requestedBy', 
      select: 'id name email',
      model: 'Employee'
    })
    .populate({
      path: 'reviewedBy',
      select: 'id email role',
      model: 'User'
    })
    .populate({
      path: 'replacementEmployee',
      select: 'id name email',
      model: 'Employee'
    });

  if (query.startDate || query.endDate) {
    const dateFilter: any = {};
    
    if (query.startDate) {
      dateFilter.startDate = { $gte: new Date(query.startDate as string) };
    }
    
    if (query.endDate) {
      dateFilter.endDate = { $lte: new Date(query.endDate as string) };
    }
    
    baseQuery = baseQuery.where(dateFilter);
  }

  const filteredQuery = { ...query };
  delete filteredQuery.startDate;
  delete filteredQuery.endDate;

  const timeOffQuery = new QueryBuilder(baseQuery, filteredQuery)
    .search(TIME_OFF_SEARCHABLE_FIELDS)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await timeOffQuery.modelQuery;
  const meta = await timeOffQuery.countTotal();

  console.log('Found documents:', result.length);
  
  return { result, meta };
};


const getSingleTimeOffRequestFromDB = async (id: string): Promise<TTimeOffRequest> => {
  const result = await TimeOffRequest.findById(id)
    .populate('employee', 'id name email department role location')
    .populate('requestedBy', 'id name email')
    .populate('reviewedBy', 'id email role')
    .populate('replacementEmployee', 'id name email')
    .populate('conflictingShifts');

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Time-off request not found');
  }

  return result;
};

const updateTimeOffRequestIntoDB = async (
  id: string,
  payload: IUpdateTimeOffRequest
): Promise<TTimeOffRequest> => {
  const timeOffRequest = await TimeOffRequest.findById(id);
  if (!timeOffRequest) {
    throw new AppError(httpStatus.NOT_FOUND, 'Time-off request not found');
  }

  if (timeOffRequest.status !== TIME_OFF_STATUS.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot modify request that has been reviewed'
    );
  }

  let totalDays = timeOffRequest.totalDays;
  if (payload.startDate || payload.endDate) {
    const startDate = new Date(payload.startDate || timeOffRequest.startDate);
    const endDate = new Date(payload.endDate || timeOffRequest.endDate);
    
    if (endDate < startDate) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'End date cannot be before start date'
      );
    }
    
    const timeDiff = endDate.getTime() - startDate.getTime();
    totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; 
    
    payload.startDate = startDate.toISOString();
    payload.endDate = endDate.toISOString();
  }

  const result = await TimeOffRequest.findByIdAndUpdate(
    id,
    { ...payload, totalDays },
    { new: true, runValidators: true }
  ).populate('employee', 'id name email department');

  return result!;
};

const reviewTimeOffRequestIntoDB = async (
  id: string,
  payload: IReviewTimeOffRequest,
  reviewedBy: string
): Promise<TTimeOffRequest> => {
  const timeOffRequest = await TimeOffRequest.findById(id);
  if (!timeOffRequest) {
    throw new AppError(httpStatus.NOT_FOUND, 'Time-off request not found');
  }

  if (timeOffRequest.status !== TIME_OFF_STATUS.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Request has already been reviewed'
    );
  }

  const reviewer = await Employee.findOne({ id: reviewedBy }) || 
                  await mongoose.model('User').findOne({ id: reviewedBy });
  
  if (!reviewer) {
    throw new AppError(httpStatus.NOT_FOUND, 'Reviewer not found');
  }

  const updateData = {
    status: payload.status,
    reviewedBy: reviewer._id,
    reviewedAt: new Date(),
    reviewNotes: payload.reviewNotes,
  };

  const result = await TimeOffRequest.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate('employee', 'id name email department')
    .populate('reviewedBy', 'id email role');

  const employee = timeOffRequest.employee.toString();
  const type = timeOffRequest.type;
  const days = timeOffRequest.totalDays;

  if (payload.status === 'approved') {
    await updateEmployeeBalance(employee, type, days, 'approve');
  } else {
    await updateEmployeeBalance(employee, type, days, 'reject');
  }

  return result!;
};

const deleteTimeOffRequestFromDB = async (id: string): Promise<TTimeOffRequest> => {
  const timeOffRequest = await TimeOffRequest.findById(id);
  if (!timeOffRequest) {
    throw new AppError(httpStatus.NOT_FOUND, 'Time-off request not found');
  }

  if (timeOffRequest.status === TIME_OFF_STATUS.APPROVED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot delete approved time-off request'
    );
  }

  const result = await TimeOffRequest.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  return result!;
};


const getEmployeeBalanceFromDB = async (employeeId: string): Promise<TTimeOffBalance> => {
  const employee = await Employee.findOne({ id: employeeId });
  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  return await getOrCreateEmployeeBalance(employee._id.toString());
};

const getOrCreateEmployeeBalance = async (employeeObjectId: string): Promise<TTimeOffBalance> => {
  const currentYear = new Date().getFullYear();
  
  let balance = await TimeOffBalance.findOne({
    employee: employeeObjectId,
    year: currentYear,
  });

  if (!balance) {
    const employee = await Employee.findById(employeeObjectId);
    const policy = await TimeOffPolicy.findOne({
      department: employee?.department,
      isActive: true,
    });

    balance = await TimeOffBalance.create({
      employee: employeeObjectId,
      year: currentYear,
      vacation: {
        allocated: policy?.annualVacationDays || 25,
        used: 0,
        pending: 0,
        remaining: policy?.annualVacationDays || 25,
      },
      sick: {
        allocated: policy?.annualSickDays || 10,
        used: 0,
        pending: 0,
        remaining: policy?.annualSickDays || 10,
      },
      personal: {
        allocated: policy?.annualPersonalDays || 5,
        used: 0,
        pending: 0,
        remaining: policy?.annualPersonalDays || 5,
      },
    });
  }

  return balance;
};

const updateEmployeeBalance = async (
  employeeId: string,
  type: string,
  days: number,
  action: 'pending' | 'approve' | 'reject'
): Promise<void> => {
  const balance = await getOrCreateEmployeeBalance(employeeId);
  const typeBalance = balance[type as keyof typeof balance] as any;

  switch (action) {
    case 'pending':
      typeBalance.pending += days;
      typeBalance.remaining -= days;
      break;
    case 'approve':
      typeBalance.pending -= days;
      typeBalance.used += days;
      break;
    case 'reject':
      typeBalance.pending -= days;
      typeBalance.remaining += days;
      break;
  }

  await balance.save();
};


const getTimeOffAnalyticsFromDB = async (
  query: ITimeOffQuery
): Promise<ITimeOffAnalytics> => {
  const matchStage: any = {
    isDeleted: { $ne: true },
  };

  if (query.startDate) matchStage.startDate = { $gte: new Date(query.startDate) };
  if (query.endDate) matchStage.endDate = { $lte: new Date(query.endDate) };
  if (query.department) matchStage['employee.department'] = query.department;
  if (query.type) matchStage.type = query.type;

  const [analytics] = await TimeOffRequest.aggregate([
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: '$employee' },
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        approvedRequests: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejectedRequests: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        pendingRequests: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        avgProcessingTime: {
          $avg: {
            $cond: [
              { $ne: ['$reviewedAt', null] },
              { $subtract: ['$reviewedAt', '$createdAt'] },
              null
            ]
          }
        },
        typeBreakdown: { $push: '$type' }
      }
    }
  ]);

  const departmentBreakdown = await TimeOffRequest.aggregate([
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: '$employee' },
    { $match: matchStage },
    {
      $group: {
        _id: '$employee.department',
        totalRequests: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
      }
    },
    {
      $project: {
        department: '$_id',
        totalRequests: 1,
        approvalRate: {
          $multiply: [
            { $divide: ['$approved', '$totalRequests'] },
            100
          ]
        }
      }
    }
  ]);

  const monthlyTrends = await TimeOffRequest.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        requests: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
      }
    },
    {
      $project: {
        month: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            { $toString: '$_id.month' }
          ]
        },
        requests: 1,
        approved: 1
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  return {
    totalRequests: analytics?.totalRequests || 0,
    approvedRequests: analytics?.approvedRequests || 0,
    rejectedRequests: analytics?.rejectedRequests || 0,
    pendingRequests: analytics?.pendingRequests || 0,
    averageProcessingTime: analytics?.avgProcessingTime ? 
      Math.round(analytics.avgProcessingTime / (1000 * 60 * 60 * 24)) : 0, // Convert to days
    mostRequestedType: getMostFrequentType(analytics?.typeBreakdown || []),
    departmentBreakdown,
    monthlyTrends,
  };
};

const getEmployeeTimeOffSummaryFromDB = async (
  employeeId: string
): Promise<IEmployeeTimeOffSummary> => {
  const employee = await Employee.findOne({ id: employeeId });
  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const [summary] = await TimeOffRequest.aggregate([
    {
      $match: {
        employee: employee._id,
        isDeleted: { $ne: true }
      }
    },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeData'
      }
    },
    { $unwind: '$employeeData' },
    {
      $group: {
        _id: '$employee',
        employee: { $first: '$employeeData' },
        recentRequests: {
          $push: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)] },
              '$ROOT',
              '$REMOVE'
            ]
          }
        },
        upcomingTimeOff: {
          $push: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'approved'] },
                  { $gte: ['$startDate', new Date()] }
                ]
              },
              '$ROOT',
              '$REMOVE'
            ]
          }
        },
        totalDaysThisYear: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'approved'] },
                  { $gte: ['$startDate', new Date(new Date().getFullYear(), 0, 1)] }
                ]
              },
              '$totalDays',
              0
            ]
          }
        }
      }
    }
  ]);

  const balance = await getOrCreateEmployeeBalance(employee._id.toString());

  return {
    employee: {
      _id: employee._id,
      name: `${employee.name.firstName} ${employee.name.lastName}`,
      id: employee.id,
      department: employee.department,
    },
    balance,
    recentRequests: summary?.recentRequests || [],
    upcomingTimeOff: summary?.upcomingTimeOff || [],
    totalDaysThisYear: summary?.totalDaysThisYear || 0,
  };
};


const getMostFrequentType = (types: string[]): string => {
  const frequency: Record<string, number> = {};
  types.forEach(type => {
    frequency[type] = (frequency[type] || 0) + 1;
  });
  
  return Object.keys(frequency).reduce((a, b) => 
    frequency[a] > frequency[b] ? a : b
  ) || TIME_OFF_TYPE.VACATION;
};

export const TimeOffServices = {
  createTimeOffRequestIntoDB,
  getAllTimeOffRequestsFromDB,
  getSingleTimeOffRequestFromDB,
  updateTimeOffRequestIntoDB,
  reviewTimeOffRequestIntoDB,
  deleteTimeOffRequestFromDB,
  getEmployeeBalanceFromDB,
  getTimeOffAnalyticsFromDB,
  getEmployeeTimeOffSummaryFromDB,
};