/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { ScheduleServices } from './schedule.service';
import { Employee } from '../employee/employee.model';
import { User } from '../User/user.model';

const createSchedule = catchAsync(async (req: Request, res: Response) => {
  const userStringId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  
  let user;
  if (userRole === 'superAdmin' || userRole === 'admin') {
    user = await User.findOne({ id: userStringId });
  } else {
    user = await Employee.findOne({ id: userStringId });
  }
  
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  const createdBy = user._id;
  
  const scheduleData = {
    ...req.body,
    createdBy,
  };

  const result = await ScheduleServices.createScheduleIntoDB(scheduleData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Schedule created successfully',
    data: result,
  });
});

const assignShift = catchAsync(async (req: Request, res: Response) => {
  const { scheduleId } = req.params;
  const userStringId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  
  let user;
  if (userRole === 'superAdmin' || userRole === 'admin') {
    user = await User.findOne({ id: userStringId });
  } else {
    user = await Employee.findOne({ id: userStringId });
  }
  
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  const createdBy = user._id;
  
  const shiftData = {
    ...req.body,
    createdBy,
  };

  const result = await ScheduleServices.assignShiftToEmployee(scheduleId, shiftData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift assigned successfully',
    data: result,
  });
});

const publishSchedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userStringId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  
  let user;
  if (userRole === 'superAdmin' || userRole === 'admin') {
    user = await User.findOne({ id: userStringId });
  } else {
    user = await Employee.findOne({ id: userStringId });
  }
  
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  const publishedBy = user._id.toString();

  const result = await ScheduleServices.publishSchedule(id, publishedBy);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule published successfully',
    data: result,
  });
});

const getMySchedule = catchAsync(async (req: Request, res: Response) => {
  const userStringId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  const { startDate, endDate } = req.query;
  
  let user;
  if (userRole === 'superAdmin' || userRole === 'admin') {
    user = await User.findOne({ id: userStringId });
  } else {
    user = await Employee.findOne({ id: userStringId });
  }
  
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  const employeeId = user._id.toString();

  const result = await ScheduleServices.getEmployeeSchedule(
    employeeId,
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

const getAllSchedules = catchAsync(async (req: Request, res: Response) => {
  const result = await ScheduleServices.getAllSchedulesFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedules retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getSingleSchedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ScheduleServices.getSingleScheduleFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule retrieved successfully',
    data: result,
  });
});

const updateSchedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ScheduleServices.updateScheduleIntoDB(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule updated successfully',
    data: result,
  });
});

const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ScheduleServices.deleteScheduleFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedule deleted successfully',
    data: result,
  });
});

const getScheduleByDateRange = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const result = await ScheduleServices.getScheduleByDateRange(
    startDate as string,
    endDate as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Schedules retrieved successfully',
    data: result,
  });
});

const getEmployeeSchedules = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;

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

export const ScheduleControllers = {
  createSchedule,
  getAllSchedules,
  getSingleSchedule,
  updateSchedule,
  deleteSchedule,
  assignShift,
  publishSchedule,
  getScheduleByDateRange,
  getEmployeeSchedules,
  getMySchedule,
};