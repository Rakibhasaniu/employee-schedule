// modules/ShiftTemplate/shiftTemplate.validation.ts
import { z } from 'zod';

const createShiftTemplateValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Template name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    department: z.string().min(1, 'Department is required'),
    location: z.string().min(1, 'Location is required'),
    defaultShift: z.object({
      startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
      endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
      shiftType: z.enum(['morning', 'afternoon', 'night', 'full-day']),
      role: z.string().min(1, 'Role is required'),
      requiredSkills: z.array(z.string()).default([]),
      breakDuration: z.number().min(0, 'Break duration cannot be negative').optional(),
    }).refine((data) => {
      const start = new Date(`1970-01-01T${data.startTime}`);
      const end = new Date(`1970-01-01T${data.endTime}`);
      return start < end;
    }, {
      message: "Start time must be before end time",
      path: ["startTime"],
    }),
    recurrencePattern: z.object({
      type: z.enum(['daily', 'weekly', 'monthly']),
      days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
      interval: z.number().min(1, 'Interval must be at least 1').default(1),
      endDate: z.string().transform((str) => new Date(str)).optional(),
    }).refine((data) => {
      if (data.type === 'weekly') {
        return data.days && data.days.length > 0;
      }
      return true;
    }, {
      message: "Weekly recurrence requires at least one day",
      path: ["days"],
    }),
    isActive: z.boolean().default(true),
  }),
});

const updateShiftTemplateValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    department: z.string().optional(),
    location: z.string().optional(),
    defaultShift: z.object({
      startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      shiftType: z.enum(['morning', 'afternoon', 'night', 'full-day']).optional(),
      role: z.string().optional(),
      requiredSkills: z.array(z.string()).optional(),
      breakDuration: z.number().min(0).optional(),
    }).refine((data) => {
      if (data.startTime && data.endTime) {
        const start = new Date(`1970-01-01T${data.startTime}`);
        const end = new Date(`1970-01-01T${data.endTime}`);
        return start < end;
      }
      return true;
    }, {
      message: "Start time must be before end time",
      path: ["startTime"],
    }).optional(),
    recurrencePattern: z.object({
      type: z.enum(['daily', 'weekly', 'monthly']).optional(),
      days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
      interval: z.number().min(1).optional(),
      endDate: z.string().transform((str) => new Date(str)).optional(),
    }).optional(),
    isActive: z.boolean().optional(),
  }),
});

const generateShiftsValidationSchema = z.object({
  params: z.object({
    templateId: z.string().min(1, 'Template ID is required'),
  }),
  body: z.object({
    startDate: z.string().min(1, 'Start date is required').transform((str) => new Date(str)),
    endDate: z.string().min(1, 'End date is required').transform((str) => new Date(str)),
    scheduleId: z.string().min(1, 'Schedule ID is required'),
  }).refine((data) => {
    return data.startDate < data.endDate;
  }, {
    message: "Start date must be before end date",
    path: ["startDate"],
  }),
});

const departmentValidationSchema = z.object({
  params: z.object({
    department: z.string().min(1, 'Department is required'),
  }),
});

const templateAnalyticsValidationSchema = z.object({
  params: z.object({
    templateId: z.string().min(1, 'Template ID is required'),
  }),
  query: z.object({
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
  }).refine((data) => {
    return data.startDate < data.endDate;
  }, {
    message: "Start date must be before end date",
    path: ["startDate"],
  }),
});

export const ShiftTemplateValidations = {
  createShiftTemplateValidationSchema,
  updateShiftTemplateValidationSchema,
  generateShiftsValidationSchema,
  departmentValidationSchema,
  templateAnalyticsValidationSchema,
};