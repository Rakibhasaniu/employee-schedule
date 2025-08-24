/* eslint-disable @typescript-eslint/no-explicit-any */
// modules/ShiftTemplate/shiftTemplate.service.ts
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { ShiftTemplate } from './shiftTemplate.model';
import { Employee } from '../employee/employee.model';
import { TShiftTemplate } from './shiftTemplate.interface';
import { Shift } from '../shift/shift.model';
import { generateDateRange, getDayName } from '../../utils/dateUtils';


const createShiftTemplateIntoDB = async (payload: TShiftTemplate) => {
  // Validate that the template doesn't conflict with existing templates
  const existingTemplate = await ShiftTemplate.findOne({
    name: payload.name,
    department: payload.department,
    location: payload.location,
    isActive: true,
    isDeleted: false
  });

  if (existingTemplate) {
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

  const templateQuery = new QueryBuilder(
    ShiftTemplate.find({ isDeleted: false })
      .populate('createdBy', 'id email role')
      .populate('updatedBy', 'id email role'),
    query,
  )
    .search(templateSearchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await templateQuery.modelQuery;
  const meta = await templateQuery.countTotal();

  return { result, meta };
};

const getSingleShiftTemplateFromDB = async (id: string) => {
  const result = await ShiftTemplate.findOne({ 
    _id: id, 
    isDeleted: false 
  })
    .populate('createdBy', 'id email role')
    .populate('updatedBy', 'id email role');

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift template not found');
  }

  return result;
};

const updateShiftTemplateIntoDB = async (id: string, payload: Partial<TShiftTemplate>) => {
  const template = await ShiftTemplate.findOne({ 
    _id: id, 
    isDeleted: false 
  });
  
  if (!template) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift template not found');
  }

  // Check if name conflict with other templates (excluding current one)
  if (payload.name || payload.department || payload.location) {
    const conflictingTemplate = await ShiftTemplate.findOne({
      _id: { $ne: id },
      name: payload.name || template.name,
      department: payload.department || template.department,
      location: payload.location || template.location,
      isActive: true,
      isDeleted: false
    });

    if (conflictingTemplate) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Another active template with this name already exists for this department and location'
      );
    }
  }

  const result = await ShiftTemplate.findByIdAndUpdate(
    id, 
    payload, 
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('createdBy', 'id email role')
    .populate('updatedBy', 'id email role');

  return result;
};

const deleteShiftTemplateFromDB = async (id: string) => {
  const template = await ShiftTemplate.findOne({ 
    _id: id, 
    isDeleted: false 
  });
  
  if (!template) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift template not found');
  }

  // Check if template is being used in any active schedules
  const templateInUse = await Shift.findOne({
    templateId: id,
    status: { $in: ['scheduled', 'in-progress'] },
    isDeleted: false
  });

  if (templateInUse) {
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
  const template = await ShiftTemplate.findOne({ 
    _id: templateId, 
    isDeleted: false 
  });
  
  if (!template) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shift template not found');
  }

  if (!template.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot generate shifts from inactive template');
  }

  const generatedShifts: any[] = [];

  // Find employees with required skills, location, and role for auto-assignment
  const availableEmployees = await Employee.find({
    skills: { $all: template.defaultShift.requiredSkills }, // Use $all instead of $in
    location: template.location, // Match template location
    role: { $regex: new RegExp(`^${template.defaultShift.role}$`, 'i') }, // Case-insensitive role match
    isDeleted: false,
    status: 'active'
  });

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
  const templates = await ShiftTemplate.find({
    department,
    isActive: true,
    isDeleted: false
  }).populate('createdBy', 'id email role');

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
  const template = await ShiftTemplate.findOne({ 
    _id: id, 
    isDeleted: false 
  });
  
  if (!template) {
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