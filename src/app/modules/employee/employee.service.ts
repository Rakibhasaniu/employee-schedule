/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import config from '../../config';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { User } from '../User/user.model';
import { TUser } from '../User/user.interface';
import { TEmployee } from './employee.interface';
import { Employee } from './employee.model';
import { generateEmployeeId } from './employee.utils';

const createEmployeeIntoDB = async (
  file: any,
  password: string,
  payload: TEmployee,
) => {
  // create a user object
  const userData: Partial<TUser> = {};

  //if password is not given , use default password
  userData.password = password || (config.default_password as string);

  //set employee role
  userData.role = 'employee';
  // set employee email
  userData.email = payload.email;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    //set  generated id
    userData.id = await generateEmployeeId();

  

    // create a user (transaction-1)
    const newUser = await User.create([userData], { session }); // array

    //create an employee
    if (!newUser.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create user');
    }
    // set id , _id as user
    payload.id = newUser[0].id;
    payload.user = newUser[0]._id; //reference _id

    // create an employee (transaction-2)
    const newEmployee = await Employee.create([payload], { session });

    if (!newEmployee.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create employee');
    }

    await session.commitTransaction();
    await session.endSession();

    return newEmployee;
  } catch (err: any) {
    await session.abortTransaction();
    await session.endSession();
    throw new Error(err);
  }
};

const getAllEmployeesFromDB = async (query: Record<string, unknown>) => {
  const employeeSearchableFields = [
    'name.firstName',
    'name.lastName', 
    'email',
    'role',
    'department',
    'location',
    'skills'
  ];

  const employeeQuery = new QueryBuilder(
    Employee.find().populate('user', 'email role status'),
    query,
  )
    .search(employeeSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await employeeQuery.modelQuery;
  const meta = await employeeQuery.countTotal();

  return {
    result,
    meta,
  };
};

const getSingleEmployeeFromDB = async (id: string) => {
  const result = await Employee.findById(id).populate('user', 'email role status');
  
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  
  return result;
};

const getEmployeeByUserIdFromDB = async (userId: string) => {
  const result = await Employee.findOne({ user: userId }).populate('user', 'email role status');
  
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  
  return result;
};

const updateEmployeeIntoDB = async (
  id: string,
  payload: Partial<TEmployee>,
) => {
  const { name, availability, ...remainingEmployeeData } = payload;

  const modifiedUpdatedData: Record<string, unknown> = {
    ...remainingEmployeeData,
  };

  if (name && Object.keys(name).length) {
    for (const [key, value] of Object.entries(name)) {
      modifiedUpdatedData[`name.${key}`] = value;
    }
  }

  if (availability && Object.keys(availability).length) {
    for (const [key, value] of Object.entries(availability)) {
      modifiedUpdatedData[`availability.${key}`] = value;
    }
  }

  const result = await Employee.findByIdAndUpdate(id, modifiedUpdatedData, {
    new: true,
    runValidators: true,
  }).populate('user', 'email role status');

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  return result;
};

const deleteEmployeeFromDB = async (id: string) => {
  const employee = await Employee.findById(id);
  
  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Soft delete employee
    const deletedEmployee = await Employee.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true, session },
    );

    // Soft delete user
    const deletedUser = await User.findByIdAndUpdate(
      employee.user,
      { isDeleted: true },
      { new: true, session },
    );

    if (!deletedEmployee || !deletedUser) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to delete employee');
    }

    await session.commitTransaction();
    await session.endSession();

    return deletedEmployee;
  } catch (err: any) {
    await session.abortTransaction();
    await session.endSession();
    throw new Error(err);
  }
};

// Helper function to get day of week
const getDayOfWeek = (dateString: string): keyof TEmployee['availability'] => {
  const date = new Date(dateString);
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as keyof TEmployee['availability'];
};

const getEmployeeAvailability = async (employeeId: string, date: string) => {
  const employee = await Employee.findById(employeeId);
  
  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const dayOfWeek = getDayOfWeek(date);
  const availability = employee.availability[dayOfWeek];

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      department: employee.department,
    },
    date,
    dayOfWeek,
    availability,
  };
};

const updateEmployeeAvailability = async (
  employeeId: string,
  availability: TEmployee['availability'],
) => {
  const employee = await Employee.findById(employeeId);
  
  if (!employee) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  const result = await Employee.findByIdAndUpdate(
    employeeId,
    { availability },
    { new: true, runValidators: true },
  ).populate('user', 'email role status');

  return result;
};

const searchEmployeesBySkills = async (skills: string[], location?: string) => {
  const matchQuery: any = {
    skills: { $in: skills },
    isDeleted: false,
  };

  if (location) {
    matchQuery.location = location;
  }

  const employees = await Employee.find(matchQuery)
    .populate('user', 'email role status')
    .select('name role department location skills availability');

  return employees;
};

export const EmployeeServices = {
  createEmployeeIntoDB,
  getAllEmployeesFromDB,
  getSingleEmployeeFromDB,
  getEmployeeByUserIdFromDB,
  updateEmployeeIntoDB,
  deleteEmployeeFromDB,
  getEmployeeAvailability,
  updateEmployeeAvailability,
  searchEmployeesBySkills,
};