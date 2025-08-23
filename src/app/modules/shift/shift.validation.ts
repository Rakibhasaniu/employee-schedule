// modules/Shift/shift.validation.ts
import { z } from 'zod';

const createShiftValidationSchema = z.object({
  body: z.object({
    scheduleId: z.string().min(1, 'Schedule ID is required'),
    employee: z.string().min(1, 'Employee ID is required'),
    date: z.string().transform((str) => new Date(str)),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    shiftType: z.enum(['morning', 'afternoon', 'night', 'full-day']),
    location: z.string().min(1, 'Location is required'),
    role: z.string().min(1, 'Role is required'),
    requiredSkills: z.array(z.string()).optional(),
    status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional(),
    notes: z.string().optional(),
    breakDuration: z.number().min(0, 'Break duration cannot be negative').optional(),
    isTimeOff: z.boolean().optional(),
    timeOffReason: z.string().optional(),
  }).refine((data) => {
    const start = new Date(`1970-01-01T${data.startTime}`);
    const end = new Date(`1970-01-01T${data.endTime}`);
    return start < end;
  }, {
    message: "Start time must be before end time",
    path: ["startTime"],
  }),
});

const updateShiftValidationSchema = z.object({
  body: z.object({
    scheduleId: z.string().optional(),
    employee: z.string().optional(),
    date: z.string().transform((str) => new Date(str)).optional(),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional(),
    shiftType: z.enum(['morning', 'afternoon', 'night', 'full-day']).optional(),
    location: z.string().optional(),
    role: z.string().optional(),
    requiredSkills: z.array(z.string()).optional(),
    status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional(),
    notes: z.string().optional(),
    breakDuration: z.number().min(0).optional(),
    isTimeOff: z.boolean().optional(),
    timeOffReason: z.string().optional(),
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
  }),
});

const dateRangeValidationSchema = z.object({
  query: z.object({
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
    location: z.string().optional(),
    employeeId: z.string().optional(),
  }).refine((data) => {
    return data.startDate < data.endDate;
  }, {
    message: "Start date must be before end date",
    path: ["startDate"],
  }),
});

const employeeShiftsValidationSchema = z.object({
  params: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
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

const shiftCoverageValidationSchema = z.object({
  query: z.object({
    startDate: z.string().transform((str) => new Date(str)),
    endDate: z.string().transform((str) => new Date(str)),
    location: z.string().optional(),
  }).refine((data) => {
    return data.startDate < data.endDate;
  }, {
    message: "Start date must be before end date",
    path: ["startDate"],
  }),
});

export const ShiftValidations = {
  createShiftValidationSchema,
  updateShiftValidationSchema,
  dateRangeValidationSchema,
  employeeShiftsValidationSchema,
  shiftCoverageValidationSchema,
};