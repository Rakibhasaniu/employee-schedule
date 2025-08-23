/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { ShiftTemplateServices } from './shiftTemplate.service';
import { Employee } from '../employee/employee.model';
import { User } from '../User/user.model';

const createShiftTemplate = catchAsync(async (req: Request, res: Response) => {
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
  
  const templateData = {
    ...req.body,
    createdBy,
  };

  const result = await ShiftTemplateServices.createShiftTemplateIntoDB(templateData);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Shift template created successfully',
    data: result,
  });
});

const getAllShiftTemplates = catchAsync(async (req: Request, res: Response) => {
  const result = await ShiftTemplateServices.getAllShiftTemplatesFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift templates retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getSingleShiftTemplate = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ShiftTemplateServices.getSingleShiftTemplateFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift template retrieved successfully',
    data: result,
  });
});

const updateShiftTemplate = catchAsync(async (req: Request, res: Response) => {
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

  const result = await ShiftTemplateServices.updateShiftTemplateIntoDB(id, updateData);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift template updated successfully',
    data: result,
  });
});

const deleteShiftTemplate = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ShiftTemplateServices.deleteShiftTemplateFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shift template deleted successfully',
    data: result,
  });
});

const generateShiftsFromTemplate = catchAsync(async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { startDate, endDate, scheduleId } = req.body;
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
  
  const createdBy = user._id.toString();

  const result = await ShiftTemplateServices.generateShiftsFromTemplate(
    templateId,
    startDate,
    endDate,
    scheduleId,
    createdBy
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${result.length} shifts generated from template successfully`,
    data: result,
  });
});

const getTemplatesByDepartment = catchAsync(async (req: Request, res: Response) => {
  const { department } = req.params;
  const result = await ShiftTemplateServices.getTemplatesByDepartment(department);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Department templates retrieved successfully',
    data: result,
  });
});

const getTemplateUsageAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { templateId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Start date and end date are required');
  }

  const result = await ShiftTemplateServices.getTemplateUsageAnalytics(
    templateId,
    startDate as string,
    endDate as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Template usage analytics retrieved successfully',
    data: result,
  });
});

const activateTemplate = catchAsync(async (req: Request, res: Response) => {
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

  const result = await ShiftTemplateServices.activateDeactivateTemplate(
    id,
    true,
    user._id.toString()
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Template activated successfully',
    data: result,
  });
});

const deactivateTemplate = catchAsync(async (req: Request, res: Response) => {
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

  const result = await ShiftTemplateServices.activateDeactivateTemplate(
    id,
    false,
    user._id.toString()
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Template deactivated successfully',
    data: result,
  });
});

export const ShiftTemplateControllers = {
  createShiftTemplate,
  getAllShiftTemplates,
  getSingleShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
  generateShiftsFromTemplate,
  getTemplatesByDepartment,
  getTemplateUsageAnalytics,
  activateTemplate,
  deactivateTemplate,
};