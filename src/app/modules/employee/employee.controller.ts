// modules/Employee/employee.controller.ts
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { EmployeeServices } from './employee.service';

const createEmployee = catchAsync(async (req, res) => {
  const { password, employee: employeeData } = req.body;

  const result = await EmployeeServices.createEmployeeIntoDB(
    password,
    employeeData,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee is created successfully',
    data: result,
  });
});

const getAllEmployees = catchAsync(async (req, res) => {
  const result = await EmployeeServices.getAllEmployeesFromDB(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employees are retrieved successfully',
    meta: result.meta,
    data: result.result,
  });
});

const getSingleEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await EmployeeServices.getSingleEmployeeFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee is retrieved successfully',
    data: result,
  });
});

const getEmployeeByUserId = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await EmployeeServices.getEmployeeByUserIdFromDB(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee is retrieved successfully',
    data: result,
  });
});

const updateEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { employee } = req.body;
  const result = await EmployeeServices.updateEmployeeIntoDB(id, employee);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee is updated successfully',
    data: result,
  });
});

const deleteEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await EmployeeServices.deleteEmployeeFromDB(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee is deleted successfully',
    data: result,
  });
});

const getEmployeeAvailability = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  const { date } = req.query;
  
  const result = await EmployeeServices.getEmployeeAvailability(
    employeeId, 
    date as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee availability retrieved successfully',
    data: result,
  });
});

const updateEmployeeAvailability = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  const { availability } = req.body;
  
  const result = await EmployeeServices.updateEmployeeAvailability(
    employeeId,
    availability
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee availability updated successfully',
    data: result,
  });
});

const searchEmployeesBySkills = catchAsync(async (req, res) => {
  const { skills, location } = req.query;
  
  if (!skills) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Skills parameter is required',
      data: null,
    });
  }

  // ADD THIS CODE HERE 👇
  let skillsArray: string[];
  
  if (Array.isArray(skills)) {
    skillsArray = skills as string[];
  } else {
    // Split the comma-separated string
    skillsArray = (skills as string).split(',').map(skill => skill.trim());
  }
  // ADD THIS CODE HERE 👆

  const result = await EmployeeServices.searchEmployeesBySkills(
    skillsArray,  // Changed from: skillsArray as string[]
    location as string
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employees with matching skills retrieved successfully',
    data: result,
  });
});

const getMe = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  
  let result = null;
  
  if (role === 'employee') {
    result = await EmployeeServices.getEmployeeByUserIdFromDB(userId);
  } else {
    result = { message: 'Profile retrieved', userId, role };
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User profile retrieved successfully',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  
  if (role !== 'employee') {
    return sendResponse(res, {
      statusCode: httpStatus.FORBIDDEN,
      success: false,
      message: 'Only employees can update their profile through this endpoint',
      data: null,
    });
  }

  const employee = await EmployeeServices.getEmployeeByUserIdFromDB(userId);
  const result = await EmployeeServices.updateEmployeeIntoDB(
    employee._id!.toString(),
    req.body.employee
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile updated successfully',
    data: result,
  });
});

const updateMyAvailability = catchAsync(async (req, res) => {
  const { userId, role } = req.user;
  const { availability } = req.body;
  
  if (role !== 'employee') {
    return sendResponse(res, {
      statusCode: httpStatus.FORBIDDEN,
      success: false,
      message: 'Only employees can update their availability',
      data: null,
    });
  }

  const employee = await EmployeeServices.getEmployeeByUserIdFromDB(userId);
  const result = await EmployeeServices.updateEmployeeAvailability(
    employee._id!.toString(),
    availability
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Availability updated successfully',
    data: result,
  });
});

export const EmployeeControllers = {
  createEmployee,
  getAllEmployees,
  getSingleEmployee,
  getEmployeeByUserId,
  updateEmployee,
  deleteEmployee,
  getEmployeeAvailability,
  updateEmployeeAvailability,
  searchEmployeesBySkills,
  getMe,
  updateMyProfile,
  updateMyAvailability,
};