/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { TSchedule, TShift, TConflict, TCoverage } from './schedule.interface';
import { Schedule } from './schedule.model';
import { Employee } from '../employee/employee.model';

const createScheduleIntoDB = async (payload: TSchedule) => {
  // Validate date range
  if (payload.weekStartDate >= payload.weekEndDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Week start date must be before end date');
  }

  // Validate employees exist
  if (payload.shifts && payload.shifts.length > 0) {
    const employeeIds = payload.shifts.map(shift => shift.employee);
    const employees = await Employee.find({ 
      _id: { $in: employeeIds },
      isDeleted: false 
    });
    
    if (employees.length !== new Set(employeeIds.map(id => id.toString())).size) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Some employees not found or deleted');
    }

    // Check for conflicts
    payload.conflicts = await detectScheduleConflicts(payload.shifts);

    // Calculate coverage
    payload.coverage = calculateCoverage(payload.shifts, payload.coverage || []);
  }

  const result = await Schedule.create(payload);
  return result;
};

const getAllSchedulesFromDB = async (query: Record<string, unknown>) => {
  const scheduleSearchableFields = ['title'];

  const scheduleQuery = new QueryBuilder(
    Schedule.find()
      .populate('shifts.employee', 'id name email role department')
      .populate('createdBy', 'id email role')
      .populate('publishedBy', 'id email role'),
    query,
  )
    .search(scheduleSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await scheduleQuery.modelQuery;
  const meta = await scheduleQuery.countTotal();

  return { result, meta };
};

const getSingleScheduleFromDB = async (id: string) => {
  const result = await Schedule.findById(id)
    .populate('shifts.employee', 'id name email role department location')
    .populate('createdBy', 'id email role')
    .populate('publishedBy', 'id email role');

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Schedule not found');
  }

  return result;
};

const updateScheduleIntoDB = async (id: string, payload: Partial<TSchedule>) => {
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    throw new AppError(httpStatus.NOT_FOUND, 'Schedule not found');
  }

  // Prevent updating published schedules
  if (schedule.status === 'published' && payload.shifts) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot modify shifts of a published schedule'
    );
  }

  // If shifts are being updated, recheck conflicts and coverage
  if (payload.shifts) {
    const conflicts = await detectScheduleConflicts(payload.shifts);
    payload.conflicts = conflicts;
    
    const coverage = calculateCoverage(payload.shifts, payload.coverage || []);
    payload.coverage = coverage;
  }

  const result = await Schedule.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  })
    .populate('shifts.employee', 'id name email role department')
    .populate('createdBy', 'id email role');

  return result;
};

const deleteScheduleFromDB = async (id: string) => {
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    throw new AppError(httpStatus.NOT_FOUND, 'Schedule not found');
  }

  // Prevent deleting published schedules
  if (schedule.status === 'published') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot delete a published schedule'
    );
  }

  const result = await Schedule.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  return result;
};

const assignShiftToEmployee = async (
  scheduleId: string,
  shiftData: Partial<TShift>,
) => {
  const schedule = await Schedule.findById(scheduleId);
  if (!schedule) {
    throw new AppError(httpStatus.NOT_FOUND, 'Schedule not found');
  }

  if (schedule.status === 'published') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot modify a published schedule'
    );
  }

  // Validate employee exists and is available
  const employee = await Employee.findById(shiftData.employee);
  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  // Check employee availability
  const dayOfWeek = new Date(shiftData.date!).toLocaleDateString('en-US', { 
    weekday: 'long' 
  }).toLowerCase() as keyof typeof employee.availability;
  
  const availability = employee.availability[dayOfWeek];
  if (!availability.available) {
    throw new AppError(
      httpStatus.BAD_REQUEST, 
      `Employee is not available on ${dayOfWeek}`
    );
  }

  // Check for conflicts with existing shifts
  const conflicts = await detectShiftConflicts(schedule.shifts, shiftData as TShift);
  if (conflicts.length > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Shift conflicts detected: ${conflicts.map(c => c.description).join(', ')}`
    );
  }

  // Add shift to schedule
  schedule.shifts.push(shiftData as TShift);
  
  // Recalculate conflicts and coverage
  schedule.conflicts = await detectScheduleConflicts(schedule.shifts);
  schedule.coverage = calculateCoverage(schedule.shifts, schedule.coverage);

  await schedule.save();
  return schedule;
};

const getScheduleByDateRange = async (startDate: string, endDate: string) => {
  const result = await Schedule.find({
    $or: [
      {
        weekStartDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      },
      {
        weekEndDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
      },
      {
        weekStartDate: { $lte: new Date(startDate) },
        weekEndDate: { $gte: new Date(endDate) }
      }
    ]
  })
    .populate('shifts.employee', 'id name role department')
    .sort({ weekStartDate: 1 });

  return result;
};

const publishSchedule = async (id: string, publishedBy: string) => {
  const schedule = await Schedule.findById(id);
  if (!schedule) {
    throw new AppError(httpStatus.NOT_FOUND, 'Schedule not found');
  }

  if (schedule.status === 'published') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Schedule is already published');
  }

  // Check for unresolved conflicts
  const unresolvedConflicts = schedule.conflicts.filter(conflict => !conflict.resolved);
  if (unresolvedConflicts.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot publish schedule with ${unresolvedConflicts.length} unresolved conflicts`
    );
  }

  const result = await Schedule.findByIdAndUpdate(
    id,
    { 
      status: 'published',
      publishedAt: new Date(),
      publishedBy: new mongoose.Types.ObjectId(publishedBy)
    },
    { new: true }
  );

  return result;
};

const getEmployeeSchedule = async (employeeId: string, startDate: string, endDate: string) => {
  const schedules = await Schedule.find({
    'shifts.employee': employeeId,
    weekStartDate: { $gte: new Date(startDate) },
    weekEndDate: { $lte: new Date(endDate) },
    status: { $in: ['published', 'completed'] }
  })
    .populate('shifts.employee', 'id name')
    .sort({ weekStartDate: 1 });

  // Filter to only include shifts for this employee
  const employeeSchedules = schedules.map(schedule => {
    const employeeShifts = schedule.shifts.filter(
      shift => shift.employee.toString() === employeeId
    );
    
    return {
      ...schedule.toObject(),
      shifts: employeeShifts,
      totalShifts: employeeShifts.length,
      totalHours: employeeShifts.reduce((total, shift) => {
        const start = new Date(`1970-01-01T${shift.startTime}`);
        const end = new Date(`1970-01-01T${shift.endTime}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0),
    };
  });

  return employeeSchedules;
};

// Helper functions
const detectScheduleConflicts = async (shifts: TShift[]): Promise<TConflict[]> => {
  const conflicts: TConflict[] = [];
  
  // Group shifts by employee
  const shiftsByEmployee = shifts.reduce((acc, shift) => {
    const empId = shift.employee.toString();
    if (!acc[empId]) acc[empId] = [];
    acc[empId].push(shift);
    return acc;
  }, {} as Record<string, TShift[]>);

  // Check for overlapping shifts for each employee
  for (const [employeeId, empShifts] of Object.entries(shiftsByEmployee)) {
    const employee = await Employee.findById(employeeId);
    const employeeName = employee ? `${employee.name.firstName} ${employee.name.lastName}` : 'Unknown';

    for (let i = 0; i < empShifts.length; i++) {
      for (let j = i + 1; j < empShifts.length; j++) {
        const shift1 = empShifts[i];
        const shift2 = empShifts[j];
        
        // Check if shifts are on the same date
        if (shift1.date.toDateString() === shift2.date.toDateString()) {
          // Check for time overlap
          if (isTimeOverlap(shift1.startTime, shift1.endTime, shift2.startTime, shift2.endTime)) {
            conflicts.push({
              type: 'overlap',
              employeeId: new mongoose.Types.ObjectId(employeeId),
              employeeName,
              description: `Overlapping shifts on ${shift1.date.toDateString()} (${shift1.startTime}-${shift1.endTime} and ${shift2.startTime}-${shift2.endTime})`,
              conflictingShifts: [shift1._id!, shift2._id!],
              resolved: false,
            });
          }
        }
      }
    }
  }

  return conflicts;
};

const detectShiftConflicts = async (existingShifts: TShift[], newShift: TShift): Promise<TConflict[]> => {
  const conflicts: TConflict[] = [];
  const employee = await Employee.findById(newShift.employee);
  const employeeName = employee ? `${employee.name.firstName} ${employee.name.lastName}` : 'Unknown';

  const employeeShifts = existingShifts.filter(
    shift => shift.employee.toString() === newShift.employee.toString()
  );

  employeeShifts.forEach(existingShift => {
    if (existingShift.date.toDateString() === newShift.date.toDateString()) {
      if (isTimeOverlap(
        existingShift.startTime, 
        existingShift.endTime, 
        newShift.startTime, 
        newShift.endTime
      )) {
        conflicts.push({
          type: 'overlap',
          employeeId: newShift.employee,
          employeeName,
          description: `Overlapping with existing shift on ${newShift.date.toDateString()}`,
          conflictingShifts: [existingShift._id!, newShift._id!],
          resolved: false,
        });
      }
    }
  });

  return conflicts;
};

const calculateCoverage = (shifts: TShift[], requiredCoverage: TCoverage[]): TCoverage[] => {
  // Group shifts by location
  const shiftsByLocation = shifts.reduce((acc, shift) => {
    if (!acc[shift.location]) acc[shift.location] = [];
    acc[shift.location].push(shift);
    return acc;
  }, {} as Record<string, TShift[]>);

  // Calculate coverage for each location
  const coverage: TCoverage[] = [];
  
  // Start with required coverage
  requiredCoverage.forEach(req => {
    const locationShifts = shiftsByLocation[req.location] || [];
    coverage.push({
      location: req.location,
      requiredStaff: req.requiredStaff,
      assignedStaff: locationShifts.length,
      coveragePercentage: req.requiredStaff > 0 
        ? Math.round((locationShifts.length / req.requiredStaff) * 100) 
        : 0,
      shifts: locationShifts,
    });
  });

  // Add locations that have shifts but no required coverage
  Object.entries(shiftsByLocation).forEach(([location, locationShifts]) => {
    if (!coverage.find(c => c.location === location)) {
      coverage.push({
        location,
        requiredStaff: 1, // Default assumption
        assignedStaff: locationShifts.length,
        coveragePercentage: locationShifts.length > 0 ? 100 : 0,
        shifts: locationShifts,
      });
    }
  });

  return coverage;
};

const isTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const s1 = new Date(`1970-01-01T${start1}`);
  const e1 = new Date(`1970-01-01T${end1}`);
  const s2 = new Date(`1970-01-01T${start2}`);
  const e2 = new Date(`1970-01-01T${end2}`);

  return s1 < e2 && e1 > s2;
};

export const ScheduleServices = {
  createScheduleIntoDB,
  getAllSchedulesFromDB,
  getSingleScheduleFromDB,
  updateScheduleIntoDB,
  deleteScheduleFromDB,
  assignShiftToEmployee,
  getScheduleByDateRange,
  publishSchedule,
  getEmployeeSchedule,
};