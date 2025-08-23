/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { ShiftServices } from './shift.service';
import { Employee } from '../employee/employee.model';
import { User } from '../User/user.model';

const createShift = catchAsync(async (req: Request, res: Response) => {
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

  const result = await ShiftServices.createShiftIntoDB(shiftData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Shift created successfully',
    data: result,
  });
});

const getAllShifts = catchAsync(async (req: Request, res: Response) => {
  const result = await ShiftServices.getAllShiftsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shifts retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getSingleShift = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ShiftServices.getSingleShiftFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift retrieved successfully',
    data: result,
  });
});

const updateShift = catchAsync(async (req: Request, res: Response) => {
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

  const updateData = {
    ...req.body,
    updatedBy: user._id,
  };

  const result = await ShiftServices.updateShiftIntoDB(id, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift updated successfully',
    data: result,
  });
});

const deleteShift = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ShiftServices.deleteShiftFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift deleted successfully',
    data: result,
  });
});

// Aggregation endpoints
const getShiftCoverage = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate, location } = req.query;

  if (!startDate || !endDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Start date and end date are required');
  }

  const result = await ShiftServices.getShiftCoverageByDateRange(
    startDate as string,
    endDate as string,
    location as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift coverage retrieved successfully',
    data: result,
  });
});

const getEmployeeWorkload = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate, employeeId } = req.query;

  if (!startDate || !endDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Start date and end date are required');
  }

  const result = await ShiftServices.getEmployeeWorkloadAnalysis(
    startDate as string,
    endDate as string,
    employeeId as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee workload analysis retrieved successfully',
    data: result,
  });
});

const detectConflicts = catchAsync(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Start date and end date are required');
  }

  const result = await ShiftServices.detectConflictsWithAggregation(
    startDate as string,
    endDate as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift conflicts detected successfully',
    data: result,
  });
});

const getEmployeeShifts = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Start date and end date are required');
  }

  const result = await ShiftServices.getShiftsByEmployee(
    employeeId,
    startDate as string,
    endDate as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee shifts retrieved successfully',
    data: result,
  });
});

const getMyShifts = catchAsync(async (req: Request, res: Response) => {
  const userStringId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Start date and end date are required');
  }
  
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

  const result = await ShiftServices.getShiftsByEmployee(
    employeeId,
    startDate as string,
    endDate as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My shifts retrieved successfully',
    data: result,
  });
});

export const ShiftControllers = {
  createShift,
  getAllShifts,
  getSingleShift,
  updateShift,
  deleteShift,
  getShiftCoverage,
  getEmployeeWorkload,
  detectConflicts,
  getEmployeeShifts,
  getMyShifts,
};