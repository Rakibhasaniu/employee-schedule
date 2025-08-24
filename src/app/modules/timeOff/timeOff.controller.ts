/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { Employee } from '../employee/employee.model';
import { User } from '../User/user.model';
import { TimeOffServices } from './timeOff.service';


const createTimeOffRequest = catchAsync(async (req: Request, res: Response) => {
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

  const result = await TimeOffServices.createTimeOffRequestIntoDB(req.body, userStringId);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Time-off request created successfully',
    data: result,
  });
});

const getAllTimeOffRequests = catchAsync(async (req: Request, res: Response) => {
  const result = await TimeOffServices.getAllTimeOffRequestsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Time-off requests retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getSingleTimeOffRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TimeOffServices.getSingleTimeOffRequestFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Time-off request retrieved successfully',
    data: result,
  });
});

const updateTimeOffRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TimeOffServices.updateTimeOffRequestIntoDB(id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Time-off request updated successfully',
    data: result,
  });
});

const reviewTimeOffRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userStringId = (req as any).user.userId;
  const userRole = (req as any).user.role;
  
  if (userRole !== 'superAdmin' && userRole !== 'admin') {
    throw new AppError(httpStatus.FORBIDDEN, 'Only administrators can review time-off requests');
  }

  const result = await TimeOffServices.reviewTimeOffRequestIntoDB(id, req.body, userStringId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Time-off request ${req.body.status} successfully`,
    data: result,
  });
});

const deleteTimeOffRequest = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await TimeOffServices.deleteTimeOffRequestFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Time-off request deleted successfully',
    data: result,
  });
});


const getMyTimeOffRequests = catchAsync(async (req: Request, res: Response) => {
  const userStringId = (req as any).user.userId;
  
  const employee = await Employee.findOne({ id: userStringId });
  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const modifiedQuery = {
    ...req.query,
    employee: employee._id, 
  };

  const result = await TimeOffServices.getAllTimeOffRequestsFromDB(modifiedQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My time-off requests retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getMyTimeOffBalance = catchAsync(async (req: Request, res: Response) => {
  const userStringId = (req as any).user.userId;
  const result = await TimeOffServices.getEmployeeBalanceFromDB(userStringId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Time-off balance retrieved successfully',
    data: result,
  });
});

const getMyTimeOffSummary = catchAsync(async (req: Request, res: Response) => {
  const userStringId = (req as any).user.userId;
  const result = await TimeOffServices.getEmployeeTimeOffSummaryFromDB(userStringId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Time-off summary retrieved successfully',
    data: result,
  });
});


const getTimeOffAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await TimeOffServices.getTimeOffAnalyticsFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Time-off analytics retrieved successfully',
    data: result,
  });
});



const getEmployeeBalance = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const result = await TimeOffServices.getEmployeeBalanceFromDB(employeeId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee balance retrieved successfully',
    data: result,
  });
});









export const TimeOffControllers = {
  createTimeOffRequest,
  getAllTimeOffRequests,
  getSingleTimeOffRequest,
  updateTimeOffRequest,
  reviewTimeOffRequest,
  deleteTimeOffRequest,
  getMyTimeOffRequests,
  getMyTimeOffBalance,
  getMyTimeOffSummary,
  getTimeOffAnalytics,
  getEmployeeBalance,
};