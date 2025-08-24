/* eslint-disable prefer-const */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import config from '../../config';
import AppError from '../../errors/AppError';
import { User } from '../User/user.model';
import { TUser } from '../User/user.interface';
import { TEmployee } from './employee.interface';
import { Employee } from './employee.model';
import { generateEmployeeId } from './employee.utils';

const createEmployeeIntoDB = async (
  password: string,
  payload: TEmployee,
) => {
  const userData: Partial<TUser> = {};

  userData.password = password || (config.default_password as string);
  userData.role = 'employee';
  userData.email = payload.email;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    userData.id = await generateEmployeeId();

    const newUser = await User.create([userData], { session });

    if (!newUser.length) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Failed to create user');
    }

    payload.id = newUser[0].id;
    payload.user = newUser[0]._id;

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
  const {
    searchTerm,
    department,
    location,
    role,
    skills,
    page = 1,
    limit = 10,
    sort = '-createdAt',
    fields
  } = query;

  // Build match stage
  const matchStage: any = {
    isDeleted: { $ne: true }
  };

  if (department) {
    matchStage.department = { $regex: department, $options: 'i' };
  }

  if (location) {
    matchStage.location = { $regex: location, $options: 'i' };
  }

  if (role) {
    matchStage.role = { $regex: role, $options: 'i' };
  }

  if (skills) {
    const skillsArray = Array.isArray(skills) ? skills : [skills];
    matchStage.skills = { $in: skillsArray.map(skill => new RegExp(skill as string, 'i')) };
  }

  // Search across multiple fields
  if (searchTerm) {
    matchStage.$or = [
      { 'name.firstName': { $regex: searchTerm, $options: 'i' } },
      { 'name.lastName': { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { role: { $regex: searchTerm, $options: 'i' } },
      { department: { $regex: searchTerm, $options: 'i' } },
      { location: { $regex: searchTerm, $options: 'i' } },
      { skills: { $in: [new RegExp(searchTerm as string, 'i')] } }
    ];
  }

  // Build sort stage
  const sortStage: any = {};
  if (sort) {
    const sortFields = (sort as string).split(',');
    sortFields.forEach(field => {
      if (field.startsWith('-')) {
        sortStage[field.substring(1)] = -1;
      } else {
        sortStage[field] = 1;
      }
    });
  }

  // Build projection stage for fields
  let projectStage: any = {};
  if (fields) {
    const fieldList = (fields as string).split(',');
    fieldList.forEach(field => {
      if (field.startsWith('-')) {
        projectStage[field.substring(1)] = 0;
      } else {
        projectStage[field] = 1;
      }
    });
  }

  // Aggregation pipeline
  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo',
        pipeline: [
          { $project: { email: 1, role: 1, status: 1 } }
        ]
      }
    },
    { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        user: '$userInfo',
        fullName: { $concat: ['$name.firstName', ' ', '$name.lastName'] },
        totalSkills: { $size: { $ifNull: ['$skills', []] } },
        workingDays: {
          $size: {
            $filter: {
              input: { $objectToArray: '$availability' },
              cond: { $eq: ['$$this.v.available', true] }
            }
          }
        }
      }
    }
  ];

  // Add projection if fields specified
  if (Object.keys(projectStage).length > 0) {
    pipeline.push({ $project: projectStage });
  }

  // Add sorting
  if (Object.keys(sortStage).length > 0) {
    pipeline.push({ $sort: sortStage });
  }

  // Get total count for pagination
  const countPipeline = [...pipeline, { $count: 'total' }];
  const totalResult = await Employee.aggregate(countPipeline);
  const total = totalResult[0]?.total || 0;

  // Add pagination
  const skip = (Number(page) - 1) * Number(limit);
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: Number(limit) });

  // Remove userInfo field from final result
  pipeline.push({
    $project: { userInfo: 0 }
  });

  const result = await Employee.aggregate(pipeline);

  const meta = {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPage: Math.ceil(total / Number(limit))
  };

  return { result, meta };
};

const getSingleEmployeeFromDB = async (id: string) => {
  const pipeline: mongoose.PipelineStage[] = [
    { $match: { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo',
        pipeline: [
          { $project: { email: 1, role: 1, status: 1 } }
        ]
      }
    },
    { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'shifts',
        localField: '_id',
        foreignField: 'employee',
        as: 'recentShifts',
        pipeline: [
          { $match: { date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
          { $sort: { date: -1 } },
          { $limit: 5 },
          { $project: { date: 1, startTime: 1, endTime: 1, location: 1, role: 1 } }
        ]
      }
    },
    {
      $addFields: {
        user: '$userInfo',
        fullName: { $concat: ['$name.firstName', ' ', '$name.lastName'] },
        totalSkills: { $size: { $ifNull: ['$skills', []] } },
        workingDaysCount: {
          $size: {
            $filter: {
              input: { $objectToArray: '$availability' },
              cond: { $eq: ['$$this.v.available', true] }
            }
          }
        },
        recentShiftsCount: { $size: '$recentShifts' }
      }
    },
    {
      $project: { userInfo: 0 }
    }
  ];

  const result = await Employee.aggregate(pipeline);

  if (!result.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  return result[0];
};

const getEmployeeByUserIdFromDB = async (userId: string) => {
  const pipeline: mongoose.PipelineStage[] = [
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo',
        pipeline: [
          { $match: { id: userId, isDeleted: { $ne: true } } },
          { $project: { email: 1, role: 1, status: 1 } }
        ]
      }
    },
    { $unwind: '$userInfo' },
    { $match: { isDeleted: { $ne: true } } },
    {
      $addFields: {
        user: '$userInfo',
        fullName: { $concat: ['$name.firstName', ' ', '$name.lastName'] },
        totalSkills: { $size: { $ifNull: ['$skills', []] } }
      }
    },
    {
      $project: { userInfo: 0 }
    }
  ];

  const result = await Employee.aggregate(pipeline);

  if (!result.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  return result[0];
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

    const deletedEmployee = await Employee.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true, session },
    );

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

// const getDayOfWeek = (dateString: string): keyof TEmployee['availability'] => {
//   const date = new Date(dateString);
//   const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
//   return days[date.getDay()] as keyof TEmployee['availability'];
// };

const getEmployeeAvailability = async (employeeId: string, date: string) => {
  const pipeline: mongoose.PipelineStage[] = [
    { $match: { _id: new mongoose.Types.ObjectId(employeeId), isDeleted: { $ne: true } } },
    {
      $addFields: {
        requestedDate: date,
        dayOfWeek: {
          $switch: {
            branches: [
              { case: { $eq: [{ $dayOfWeek: new Date(date) }, 1] }, then: 'sunday' },
              { case: { $eq: [{ $dayOfWeek: new Date(date) }, 2] }, then: 'monday' },
              { case: { $eq: [{ $dayOfWeek: new Date(date) }, 3] }, then: 'tuesday' },
              { case: { $eq: [{ $dayOfWeek: new Date(date) }, 4] }, then: 'wednesday' },
              { case: { $eq: [{ $dayOfWeek: new Date(date) }, 5] }, then: 'thursday' },
              { case: { $eq: [{ $dayOfWeek: new Date(date) }, 6] }, then: 'friday' },
              { case: { $eq: [{ $dayOfWeek: new Date(date) }, 7] }, then: 'saturday' }
            ],
            default: 'unknown'
          }
        }
      }
    },
    {
      $addFields: {
        availabilityForDay: {
          $switch: {
            branches: [
              { case: { $eq: ['$dayOfWeek', 'sunday'] }, then: '$availability.sunday' },
              { case: { $eq: ['$dayOfWeek', 'monday'] }, then: '$availability.monday' },
              { case: { $eq: ['$dayOfWeek', 'tuesday'] }, then: '$availability.tuesday' },
              { case: { $eq: ['$dayOfWeek', 'wednesday'] }, then: '$availability.wednesday' },
              { case: { $eq: ['$dayOfWeek', 'thursday'] }, then: '$availability.thursday' },
              { case: { $eq: ['$dayOfWeek', 'friday'] }, then: '$availability.friday' },
              { case: { $eq: ['$dayOfWeek', 'saturday'] }, then: '$availability.saturday' }
            ],
            default: { available: false, start: '00:00', end: '00:00' }
          }
        }
      }
    },
    {
      $project: {
        employee: {
          id: '$id',
          name: '$name',
          role: '$role',
          department: '$department'
        },
        date: '$requestedDate',
        dayOfWeek: 1,
        availability: '$availabilityForDay'
      }
    }
  ];

  const result = await Employee.aggregate(pipeline);

  if (!result.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
  }

  return result[0];
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
  const matchStage: any = {
    skills: { $in: skills.map(skill => new RegExp(skill, 'i')) },
    isDeleted: { $ne: true }
  };

  if (location) {
    matchStage.location = { $regex: location, $options: 'i' };
  }

  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo',
        pipeline: [
          { $project: { email: 1, role: 1, status: 1 } }
        ]
      }
    },
    { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        user: '$userInfo',
        // Ensure skills is always treated as an array
        skillsArray: { $ifNull: ['$skills', []] },
        // Convert input skills to array for consistent processing
        inputSkillsArray: skills
      }
    },
    {
      $addFields: {
        matchingSkills: {
          $size: {
            $setIntersection: [
              '$skillsArray',
              '$inputSkillsArray'
            ]
          }
        }
      }
    },
    {
      $addFields: {
        skillMatchPercentage: {
          $cond: {
            if: { $gt: [{ $size: '$inputSkillsArray' }, 0] },
            then: {
              $multiply: [
                {
                  $divide: [
                    '$matchingSkills',
                    { $size: '$inputSkillsArray' }
                  ]
                },
                100
              ]
            },
            else: 0
          }
        }
      }
    },
    {
      $match: {
        matchingSkills: { $gt: 0 }
      }
    },
    {
      $sort: {
        skillMatchPercentage: -1,
        matchingSkills: -1
      }
    },
    {
      $project: {
        name: 1,
        role: 1,
        department: 1,
        location: 1,
        skills: 1,
        availability: 1,
        user: 1,
        matchingSkills: 1,
        skillMatchPercentage: { $round: ['$skillMatchPercentage', 2] }
      }
    }
  ];

  const result = await Employee.aggregate(pipeline);
  return result;
};

// New aggregation-based analytics functions
const getEmployeeAnalytics = async () => {
  const pipeline: mongoose.PipelineStage[] = [
    { $match: { isDeleted: { $ne: true } } },
    {
      $group: {
        _id: null,
        totalEmployees: { $sum: 1 },
        departmentBreakdown: {
          $push: '$department'
        },
        locationBreakdown: {
          $push: '$location'
        },
        roleBreakdown: {
          $push: '$role'
        },
        skillsBreakdown: {
          $push: '$skills'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalEmployees: 1,
        departments: {
          $reduce: {
            input: {
              $setUnion: ['$departmentBreakdown']
            },
            initialValue: [],
            in: {
              $concatArrays: [
                '$$value',
                [{
                  department: '$$this',
                  count: {
                    $size: {
                      $filter: {
                        input: '$departmentBreakdown',
                        cond: { $eq: ['$$this', '$$this'] }
                      }
                    }
                  }
                }]
              ]
            }
          }
        },
        locations: {
          $reduce: {
            input: { $setUnion: ['$locationBreakdown'] },
            initialValue: [],
            in: {
              $concatArrays: [
                '$$value',
                [{
                  location: '$$this',
                  count: {
                    $size: {
                      $filter: {
                        input: '$locationBreakdown',
                        cond: { $eq: ['$$this', '$$this'] }
                      }
                    }
                  }
                }]
              ]
            }
          }
        },
        topSkills: {
          $slice: [
            {
              $map: {
                input: {
                  $setUnion: [
                    {
                      $reduce: {
                        input: '$skillsBreakdown',
                        initialValue: [],
                        in: { $concatArrays: ['$$value', '$$this'] }
                      }
                    }
                  ]
                },
                as: 'skill',
                in: {
                  skill: '$$skill',
                  count: {
                    $size: {
                      $filter: {
                        input: {
                          $reduce: {
                            input: '$skillsBreakdown',
                            initialValue: [],
                            in: { $concatArrays: ['$$value', '$$this'] }
                          }
                        },
                        cond: { $eq: ['$$this', '$$skill'] }
                      }
                    }
                  }
                }
              }
            },
            10
          ]
        }
      }
    }
  ];

  const result = await Employee.aggregate(pipeline);
  return result[0] || {};
};

const getEmployeeAvailabilityStats = async () => {
  const pipeline: mongoose.PipelineStage[] = [
    { $match: { isDeleted: { $ne: true } } },
    {
      $project: {
        name: 1,
        department: 1,
        workingDays: {
          $size: {
            $filter: {
              input: { $objectToArray: '$availability' },
              cond: { $eq: ['$$this.v.available', true] }
            }
          }
        },
        totalHoursPerWeek: {
          $reduce: {
            input: { $objectToArray: '$availability' },
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                {
                  $cond: {
                    if: { $eq: ['$$this.v.available', true] },
                    then: {
                      $divide: [
                        {
                          $subtract: [
                            { $dateFromString: { dateString: { $concat: ['1970-01-01T', '$$this.v.end'] } } },
                            { $dateFromString: { dateString: { $concat: ['1970-01-01T', '$$this.v.start'] } } }
                          ]
                        },
                        1000 * 60 * 60
                      ]
                    },
                    else: 0
                  }
                }
              ]
            }
          }
        }
      }
    },
    {
      $group: {
        _id: '$department',
        employees: { $sum: 1 },
        avgWorkingDays: { $avg: '$workingDays' },
        avgHoursPerWeek: { $avg: '$totalHoursPerWeek' },
        totalAvailableHours: { $sum: '$totalHoursPerWeek' }
      }
    },
    {
      $sort: { totalAvailableHours: -1 }
    }
  ];

  const result = await Employee.aggregate(pipeline);
  return result;
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
  getEmployeeAnalytics,
  getEmployeeAvailabilityStats,
};