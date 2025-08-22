// modules/Schedule/schedule.controller.ts
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ScheduleServices } from './schedule.service';

const createSchedule = catchAsync(async (req, res) => {
  const result = await ScheduleServices.createScheduleIntoDB({
    ...req.body,
    createdBy: req.user.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Schedule created successfully',
    data: result,
  });
});

const getAllSchedules = catchAsync(async (req, res) => {
  const result = await ScheduleServices.getAllSchedulesFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedules retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getSingleSchedule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ScheduleServices.getSingleScheduleFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule retrieved successfully',
    data: result,
  });
});

const updateSchedule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ScheduleServices.updateScheduleIntoDB(id, {
    ...req.body,
    updatedBy: req.user.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule updated successfully',
    data: result,
  });
});

const deleteSchedule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ScheduleServices.deleteScheduleFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule deleted successfully',
    data: result,
  });
});

const assignShift = catchAsync(async (req, res) => {
  const { scheduleId } = req.params;
  const result = await ScheduleServices.assignShiftToEmployee(scheduleId, {
    ...req.body,
    createdBy: req.user.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift assigned successfully',
    data: result,
  });
});

const getScheduleByDateRange = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Start date and end date are required',
      data: null,
    });
  }

  const result = await ScheduleServices.getScheduleByDateRange(
    startDate as string,
    endDate as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedules retrieved by date range successfully',
    data: result,
  });
});

const publishSchedule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await ScheduleServices.publishSchedule(id, req.user.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule published successfully',
    data: result,
  });
});

const getMySchedule = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { startDate, endDate } = req.query;
  
  if (role !== 'employee') {
    return sendResponse(res, {
      statusCode: httpStatus.FORBIDDEN,
      success: false,
      message: 'Only employees can access this endpoint',
      data: null,
    });
  }

  if (!startDate || !endDate) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Start date and end date are required',
      data: null,
    });
  }

  // Get employee by user ID (using dynamic import to avoid circular dependency)
  const { Employee } = await import('../Employee/employee.model');
  const { User } = await import('../User/user.model');
  
  // First find user by custom ID
  const user = await User.findOne({ id: userId });
  if (!user) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'User not found',
      data: null,
    });
  }

  // Then find employee by user ObjectId
  const employee = await Employee.findOne({ user: user._id });
  if (!employee) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Employee not found',
      data: null,
    });
  }

  const result = await ScheduleServices.getEmployeeSchedule(
    employee._id!.toString(),
    startDate as string,
    endDate as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My schedule retrieved successfully',
    data: result,
  });
});

const getEmployeeSchedules = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Start date and end date are required',
      data: null,
    });
  }

  const result = await ScheduleServices.getEmployeeSchedule(
    employeeId,
    startDate as string,
    endDate as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee schedules retrieved successfully',
    data: result,
  });
});

const resolveConflict = catchAsync(async (req, res) => {
  const { scheduleId, conflictId } = req.params;
  const { resolved, resolvedReason } = req.body;

  // Get schedule and update conflict status
  const { Schedule } = await import('./schedule.model');
  const schedule = await Schedule.findById(scheduleId);
  
  if (!schedule) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Schedule not found',
      data: null,
    });
  }

  const conflict = schedule.conflicts.id(conflictId);
  if (!conflict) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Conflict not found',
      data: null,
    });
  }

  conflict.resolved = resolved;
  if (resolved) {
    conflict.resolvedBy = req.user.userId;
    conflict.resolvedAt = new Date();
  }

  await schedule.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Conflict resolved successfully',
    data: conflict,
  });
});

const getScheduleConflicts = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { resolved } = req.query;

  const { Schedule } = await import('./schedule.model');
  const schedule = await Schedule.findById(id)
    .populate('conflicts.employeeId', 'id name email')
    .populate('conflicts.resolvedBy', 'id email');
  
  if (!schedule) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Schedule not found',
      data: null,
    });
  }

  let conflicts = schedule.conflicts;
  
  // Filter by resolved status if specified
  if (resolved !== undefined) {
    const isResolved = resolved === 'true';
    conflicts = conflicts.filter(conflict => conflict.resolved === isResolved);
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule conflicts retrieved successfully',
    data: conflicts,
  });
});

const getScheduleCoverage = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { Schedule } = await import('./schedule.model');
  const schedule = await Schedule.findById(id);
  
  if (!schedule) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Schedule not found',
      data: null,
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule coverage retrieved successfully',
    data: {
      totalEmployees: schedule.totalEmployees,
      totalHours: schedule.totalHours,
      coverage: schedule.coverage,
      overallCoverage: schedule.coverage.reduce((sum, cov) => sum + cov.coveragePercentage, 0) / schedule.coverage.length || 0,
    },
  });
});

const duplicateSchedule = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { title, weekStartDate, weekEndDate } = req.body;

  const originalSchedule = await ScheduleServices.getSingleScheduleFromDB(id);
  
  if (!originalSchedule) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Original schedule not found',
      data: null,
    });
  }

  // Create new schedule based on original
  const duplicatedSchedule = {
    title: title || `Copy of ${originalSchedule.title}`,
    weekStartDate: new Date(weekStartDate),
    weekEndDate: new Date(weekEndDate),
    shifts: originalSchedule.shifts.map(shift => ({
      ...shift.toObject(),
      _id: undefined, // Remove original ID
      date: new Date(weekStartDate), // Adjust date to new week
    })),
    coverage: originalSchedule.coverage,
    createdBy: req.user.userId,
  };

  const result = await ScheduleServices.createScheduleIntoDB(duplicatedSchedule);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Schedule duplicated successfully',
    data: result,
  });
});

export const ScheduleControllers = {
  createSchedule,
  getAllSchedules,
  getSingleSchedule,
  updateSchedule,
  deleteSchedule,
  assignShift,
  getScheduleByDateRange,
  publishSchedule,
  getMySchedule,
  getEmployeeSchedules,
  resolveConflict,
  getScheduleConflicts,
  getScheduleCoverage,
  duplicateSchedule,
};