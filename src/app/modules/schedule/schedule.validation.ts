// modules/Schedule/.validation.ts
import { z } from 'zod';

const shiftSchema = z.object({
  employee: z.string().min(1, 'Employee ID is required'),
  date: z.string().transform((str) => new Date(str)),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  shiftType: z.enum(['morning', 'afternoon', 'night', 'full-day']),
  location: z.string().min(1, 'Location is required'),
  role: z.string().min(1, 'Role is required'),
  notes: z.string().optional(),
  isTimeOff: z.boolean().optional(),
  timeOffReason: z.string().optional(),
});

const coverageSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  requiredStaff: z.number().min(1, 'Required staff must be at least 1'),
  assignedStaff: z.number().min(0).optional(),
  coveragePercentage: z.number().min(0).max(100).optional(),
});

const createScheduleValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
    weekStartDate: z.string().transform((str) => new Date(str)),
    weekEndDate: z.string().transform((str) => new Date(str)),
    shifts: z.array(shiftSchema).optional(),
    status: z.enum(['draft', 'published', 'completed']).optional(),
    coverage: z.array(coverageSchema).optional(),
  }).refine((data) => {
    return new Date(data.weekStartDate) < new Date(data.weekEndDate);
  }, {
    message: "Week start date must be before end date",
    path: ["weekStartDate"],
  }),
});

const updateScheduleValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(100).optional(),
    weekStartDate: z.string().transform((str) => new Date(str)).optional(),
    weekEndDate: z.string().transform((str) => new Date(str)).optional(),
    shifts: z.array(shiftSchema).optional(),
    status: z.enum(['draft', 'published', 'completed']).optional(),
    coverage: z.array(coverageSchema).optional(),
  }),
});

const assignShiftValidationSchema = z.object({
  body: shiftSchema,
});

const dateRangeValidationSchema = z.object({
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

export const ScheduleValidations = {
  createScheduleValidationSchema,
  updateScheduleValidationSchema,
  assignShiftValidationSchema,
  dateRangeValidationSchema,
};