/* eslint-disable @typescript-eslint/no-explicit-any */
// modules/ShiftTemplate/shiftTemplate.service.ts
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import { ShiftTemplate } from './shiftTemplate.model';
import { Employee } from '../employee/employee.model';
import { TShiftTemplate } from './shiftTemplate.interface';
import { Shift } from '../shift/shift.model';
import { generateDateRange, getDayName } from '../../utils/dateUtils';

const createShiftTemplateIntoDB = async (payload: TShiftTemplate) => {
  // Use aggregation to check for existing templates
  const existingTemplate = await ShiftTemplate.aggregate([
    {
      $match: {
        name: payload.name,
        department: payload.department,
        location: payload.location,
        isActive: true,
        isDeleted: false
      }
    },
    {
      $limit: 1
    }
  ]);

  if (existingTemplate.length > 0) {
    throw new AppError(
      httpStatus.CONFLICT, 
      'An active template with this name already exists for this department and location'
    );
  }

  const result = await ShiftTemplate.create(payload);
  return result;
};

const getAllShiftTemplatesFromDB = async (query: Record<string, unknown>) => {
  const templateSearchableFields = ['name', 'description', 'department', 'location'];
  
  // Build match stage based on query filters
  const matchStage: any = { isDeleted: false };
  
  // Handle search functionality
  if (query.searchTerm) {
    const searchRegex = { $regex: query.searchTerm, $options: 'i' };
    matchStage.$or = templateSearchableFields.map(field => ({
      [field]: searchRegex
    }));
  }

  // Handle other filters
  Object.keys(query).forEach(key => {
    if (!['searchTerm', 'sort', 'limit', 'page', 'fields'].includes(key)) {
      matchStage[key] = query[key];
    }
  });

  // Build sort stage
  let sortStage: any = { createdAt: -1 };
  if (query.sort) {
    const sortBy = query.sort as string;
    const sortOrder = sortBy.startsWith('-') ? -1 : 1;
    const sortField = sortBy.startsWith('-') ? sortBy.slice(1) : sortBy;
    sortStage = { [sortField]: sortOrder };
  }

  // Pagination
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build projection stage for fields
  let projectStage: any = null;
  if (query.fields) {
    const fields = (query.fields as string).split(',');
    projectStage = {};
    fields.forEach(field => {
      projectStage[field.trim()] = 1;
    });
  }

  const pipeline: mongoose.PipelineStage[] = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'users', // assuming users collection for createdBy
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdBy',
        pipeline: [
          { $project: { id: 1, email: 1, role: 1 } }
        ]
      }
    },
    {
      $lookup: {
        from: 'users', // assuming users collection for updatedBy
        localField: 'updatedBy',
        foreignField: '_id',
        as: 'updatedBy',
        pipeline: [
          { $project: { id: 1, email: 1, role: 1 } }
        ]
      }
    },
    {
      $unwind: {
        path: '$createdBy',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: '$updatedBy',
        preserveNullAndEmptyArrays: true
      }
    },
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limit }
  ];

  // Add projection stage if fields are specified
  if (projectStage) {
    pipeline.push({ $project: projectStage });
  }

  const result = await ShiftTemplate.aggregate(pipeline);

  // Get total count for pagination
  const countPipeline = [
    { $match: matchStage },
    { $count: 'total' }
  ];
  const countResult = await ShiftTemplate.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  const meta = {
    page,
    limit,
    total,
    totalPage: Math.ceil(total / limit)
  };

  return { result, meta };
};

const getSingleShiftTemplateFromDB = async (id: string) => {
  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdBy',
        pipeline: [
          { $project: { id: 1, email: 1, role: 1 } }
        ]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'updatedBy',
        foreignField: '_id',
        as: 'updatedBy',
        pipeline: [
          { $project: { id: 1, email: 1, role: 1 } }
        ]
      }
    },
    {
      $unwind: {
        path: '$createdBy',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $unwind: {
        path: '$updatedBy',
        preserveNullAndEmptyArrays: true
      }
    }
  ];

  const result = await ShiftTemplate.aggregate(pipeline);

  if (!result || result.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift template not found');
  }

  return result[0];
};

const updateShiftTemplateIntoDB = async (id: string, payload: Partial<TShiftTemplate>) => {
  // Check if template exists
  const templateExists = await ShiftTemplate.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false
      }
    },
    { $limit: 1 }
  ]);
  
  if (templateExists.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift template not found');
  }

  const template = templateExists[0];

  // Check if name conflict with other templates (excluding current one)
  if (payload.name || payload.department || payload.location) {
    const conflictingTemplate = await ShiftTemplate.aggregate([
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(id) },
          name: payload.name || template.name,
          department: payload.department || template.department,
          location: payload.location || template.location,
          isActive: true,
          isDeleted: false
        }
      },
      { $limit: 1 }
    ]);

    if (conflictingTemplate.length > 0) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Another active template with this name already exists for this department and location'
      );
    }
  }

  // Prepare update object with proper nested field handling
  const updateObj: any = {};
  
  // Handle top-level fields
  if (payload.name !== undefined) updateObj.name = payload.name;
  if (payload.description !== undefined) updateObj.description = payload.description;
  if (payload.department !== undefined) updateObj.department = payload.department;
  if (payload.location !== undefined) updateObj.location = payload.location;
  if (payload.isActive !== undefined) updateObj.isActive = payload.isActive;
  if (payload.updatedBy !== undefined) updateObj.updatedBy = payload.updatedBy;

  // Handle nested defaultShift object
  if (payload.defaultShift) {
    Object.keys(payload.defaultShift).forEach(key => {
      updateObj[`defaultShift.${key}`] = (payload.defaultShift as any)[key];
    });
  }

  // Handle nested recurrencePattern object
  if (payload.recurrencePattern) {
    Object.keys(payload.recurrencePattern).forEach(key => {
      updateObj[`recurrencePattern.${key}`] = (payload.recurrencePattern as any)[key];
    });
  }

  // Add updatedAt timestamp
  updateObj.updatedAt = new Date();

  const result = await ShiftTemplate.findByIdAndUpdate(
    id, 
    { $set: updateObj }, 
    {
      new: true,
      runValidators: false, // Disable validation to avoid issues with partial updates
    }
  )
    .populate('createdBy', 'id email role')
    .populate('updatedBy', 'id email role');

  return result;
};

const deleteShiftTemplateFromDB = async (id: string) => {
  // Check if template exists using aggregation
  const template = await ShiftTemplate.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false
      }
    },
    { $limit: 1 }
  ]);
  
  if (template.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift template not found');
  }

  // Check if template is being used in any active schedules using aggregation
  const templateInUse = await Shift.aggregate([
    {
      $match: {
        templateId: new mongoose.Types.ObjectId(id),
        status: { $in: ['scheduled', 'in-progress'] },
        isDeleted: false
      }
    },
    { $limit: 1 }
  ]);

  if (templateInUse.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Cannot delete template that is currently being used in active shifts'
    );
  }

  const result = await ShiftTemplate.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

  return result;
};

const generateShiftsFromTemplate = async (
  templateId: string,
  startDate: Date,
  endDate: Date,
  scheduleId: string,
  createdBy: string
) => {
  // Get template using aggregation
  const templateResult = await ShiftTemplate.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(templateId),
        isDeleted: false
      }
    },
    { $limit: 1 }
  ]);
  
  if (templateResult.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift template not found');
  }

  const template = templateResult[0];

  if (!template.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot generate shifts from inactive template');
  }

  const generatedShifts: any[] = [];

  // Find employees with required skills, location, and role for auto-assignment using aggregation
  const availableEmployees = await Employee.aggregate([
    {
      $match: {
        skills: { $all: template.defaultShift.requiredSkills },
        location: template.location,
        role: { $regex: new RegExp(`^${template.defaultShift.role}$`, 'i') },
        isDeleted: false,
        status: 'active'
      }
    }
  ]);

  // Generate dates based on recurrence pattern
  const dates = generateDateRange(startDate, endDate);
  
  for (const currentDate of dates) {
    let shouldCreateShift = false;

    // Check recurrence pattern
    switch (template.recurrencePattern.type) {
      case 'daily':
        shouldCreateShift = true;
        break;
      case 'weekly': {
        const dayName = getDayName(currentDate);
        shouldCreateShift = template.recurrencePattern.days?.includes(dayName) || false;
        break;
      }
      case 'monthly':
        shouldCreateShift = currentDate.getDate() === startDate.getDate();
        break;
    }

    // Check if we've passed the recurrence end date
    if (template.recurrencePattern.endDate && currentDate > template.recurrencePattern.endDate) {
      shouldCreateShift = false;
    }

    if (shouldCreateShift) {
      // Find suitable employee based on availability and time slots
      const suitableEmployee = availableEmployees.find(emp => {
        const dayOfWeek = getDayName(currentDate);
        const availability = emp.availability[dayOfWeek];
        
        if (!availability || !availability.available) return false;
        
        // Check if shift time fits within availability
        const shiftStart = new Date(`1970-01-01T${template.defaultShift.startTime}`);
        const shiftEnd = new Date(`1970-01-01T${template.defaultShift.endTime}`);
        const availStart = new Date(`1970-01-01T${availability.start}`);
        const availEnd = new Date(`1970-01-01T${availability.end}`);
        
        return shiftStart >= availStart && shiftEnd <= availEnd;
      });

      const shiftData = {
        scheduleId: new mongoose.Types.ObjectId(scheduleId),
        templateId: new mongoose.Types.ObjectId(templateId),
        employee: suitableEmployee?._id || null,
        date: new Date(currentDate),
        startTime: template.defaultShift.startTime,
        endTime: template.defaultShift.endTime,
        shiftType: template.defaultShift.shiftType,
        location: template.location,
        department: template.department,
        role: template.defaultShift.role,
        requiredSkills: template.defaultShift.requiredSkills,
        breakDuration: template.defaultShift.breakDuration,
        notes: `Generated from template: ${template.name}`,
        createdBy: new mongoose.Types.ObjectId(createdBy),
        status: suitableEmployee ? 'scheduled' : 'unassigned'
      };

      generatedShifts.push(shiftData);
    }
  }

  // Bulk insert generated shifts
  if (generatedShifts.length > 0) {
    const result = await Shift.insertMany(generatedShifts);
    return result;
  }

  return [];
};

const getTemplatesByDepartment = async (department: string) => {
  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        department,
        isActive: true,
        isDeleted: false
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'createdBy',
        pipeline: [
          { $project: { id: 1, email: 1, role: 1 } }
        ]
      }
    },
    {
      $unwind: {
        path: '$createdBy',
        preserveNullAndEmptyArrays: true
      }
    }
  ];

  const templates = await ShiftTemplate.aggregate(pipeline);
  return templates;
};

const getTemplateUsageAnalytics = async (templateId: string, startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const pipeline: mongoose.PipelineStage[] = [
    {
      $match: {
        templateId: new mongoose.Types.ObjectId(templateId),
        date: { $gte: start, $lte: end },
        isDeleted: false
      }
    },
    {
      $addFields: {
        startDateTime: {
          $dateFromString: {
            dateString: {
              $concat: [
                { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                'T',
                '$startTime',
                ':00'
              ]
            }
          }
        },
        endDateTime: {
          $dateFromString: {
            dateString: {
              $concat: [
                { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                'T',
                '$endTime',
                ':00'
              ]
            }
          }
        }
      }
    },
    {
      $addFields: {
        durationHours: {
          $divide: [
            { $subtract: ['$endDateTime', '$startDateTime'] },
            1000 * 60 * 60
          ]
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          week: { $week: '$date' }
        },
        totalShifts: { $sum: 1 },
        assignedShifts: {
          $sum: { $cond: [{ $ifNull: ['$employee', false] }, 1, 0] }
        },
        uniqueEmployees: { $addToSet: '$employee' },
        totalHours: { $sum: '$durationHours' }
      }
    },
    {
      $project: {
        _id: 0,
        period: '$_id',
        totalShifts: 1,
        assignedShifts: 1,
        unassignedShifts: { $subtract: ['$totalShifts', '$assignedShifts'] },
        uniqueEmployees: { $size: { $filter: { input: '$uniqueEmployees', cond: { $ne: ['$$this', null] } } } },
        totalHours: { $round: ['$totalHours', 2] },
        assignmentRate: {
          $cond: [
            { $eq: ['$totalShifts', 0] },
            0,
            { $round: [{ $multiply: [{ $divide: ['$assignedShifts', '$totalShifts'] }, 100] }, 2] }
          ]
        }
      }
    },
    { 
      $sort: { 
        'period.year': 1 as const, 
        'period.month': 1 as const, 
        'period.week': 1 as const 
      } 
    }
  ];

  const result = await Shift.aggregate(pipeline);
  return result;
}

const activateDeactivateTemplate = async (id: string, isActive: boolean, updatedBy: string) => {
  // Check if template exists using aggregation
  const templateExists = await ShiftTemplate.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: false
      }
    },
    { $limit: 1 }
  ]);
  
  if (templateExists.length === 0) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift template not found');
  }

  const result = await ShiftTemplate.findByIdAndUpdate(
    id,
    { 
      isActive, 
      updatedBy: new mongoose.Types.ObjectId(updatedBy)
    },
    { new: true }
  ).populate('createdBy updatedBy', 'id email role');

  return result;
};

export const ShiftTemplateServices = {
  createShiftTemplateIntoDB,
  getAllShiftTemplatesFromDB,
  getSingleShiftTemplateFromDB,
  updateShiftTemplateIntoDB,
  deleteShiftTemplateFromDB,
  generateShiftsFromTemplate,
  getTemplatesByDepartment,
  getTemplateUsageAnalytics,
  activateDeactivateTemplate,
};