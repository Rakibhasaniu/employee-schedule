// modules/TimeOff/timeoff.validation.ts

import { z } from 'zod';
import { TIME_OFF_STATUS, TIME_OFF_TYPE } from './timeOff.constant';

const createTimeOffValidationSchema = z.object({
  body: z.object({
    type: z.enum([
      TIME_OFF_TYPE.VACATION,
      TIME_OFF_TYPE.SICK,
      TIME_OFF_TYPE.PERSONAL,
      TIME_OFF_TYPE.EMERGENCY,
      TIME_OFF_TYPE.BEREAVEMENT,
      TIME_OFF_TYPE.MATERNITY,
      TIME_OFF_TYPE.PATERNITY,
    ] as const),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date format',
    }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end date format',
    }),
    reason: z.string()
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason cannot exceed 500 characters')
      .trim(),
    isEmergency: z.boolean().optional().default(false),
    attachments: z.array(z.string().url()).optional(),
    replacementEmployee: z.string().optional(),
  }).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }),
});

const updateTimeOffValidationSchema = z.object({
  body: z.object({
    type: z.enum([
      TIME_OFF_TYPE.VACATION,
      TIME_OFF_TYPE.SICK,
      TIME_OFF_TYPE.PERSONAL,
      TIME_OFF_TYPE.EMERGENCY,
      TIME_OFF_TYPE.BEREAVEMENT,
      TIME_OFF_TYPE.MATERNITY,
      TIME_OFF_TYPE.PATERNITY,
    ] as const).optional(),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date format',
    }).optional(),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end date format',
    }).optional(),
    reason: z.string()
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason cannot exceed 500 characters')
      .trim()
      .optional(),
    attachments: z.array(z.string().url()).optional(),
    replacementEmployee: z.string().optional(),
  }),
});

const reviewTimeOffValidationSchema = z.object({
  body: z.object({
    status: z.enum(['approved', 'rejected'] as const),
    reviewNotes: z.string()
      .max(500, 'Review notes cannot exceed 500 characters')
      .trim()
      .optional(),
  }),
});

// Time-Off Query Validation
const timeOffQueryValidationSchema = z.object({
  // query: z.object({
    employee: z.string().optional(),
    department: z.string().optional(),
    status: z.enum([
      TIME_OFF_STATUS.PENDING,
      TIME_OFF_STATUS.APPROVED,
      TIME_OFF_STATUS.REJECTED,
      TIME_OFF_STATUS.CANCELLED,
    ] as const).optional(),
    type: z.enum([
      TIME_OFF_TYPE.VACATION,
      TIME_OFF_TYPE.SICK,
      TIME_OFF_TYPE.PERSONAL,
      TIME_OFF_TYPE.EMERGENCY,
      TIME_OFF_TYPE.BEREAVEMENT,
      TIME_OFF_TYPE.MATERNITY,
      TIME_OFF_TYPE.PATERNITY,
    ] as const).optional(),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date format',
    }).optional(),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end date format',
    }).optional(),
    year: z.string().refine((year) => !isNaN(Number(year)) && Number(year) > 2000, {
      message: 'Invalid year',
    }).optional(),
    isEmergency: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
    page: z.string().optional(),
    limit: z.string().optional(),
    sort: z.string().optional(),
  // }),
});

const updateBalanceValidationSchema = z.object({
  body: z.object({
    vacation: z.object({
      allocated: z.number().min(0).optional(),
      used: z.number().min(0).optional(),
      pending: z.number().min(0).optional(),
      remaining: z.number().min(0).optional(),
    }).optional(),
    sick: z.object({
      allocated: z.number().min(0).optional(),
      used: z.number().min(0).optional(),
      pending: z.number().min(0).optional(),
      remaining: z.number().min(0).optional(),
    }).optional(),
    personal: z.object({
      allocated: z.number().min(0).optional(),
      used: z.number().min(0).optional(),
      pending: z.number().min(0).optional(),
      remaining: z.number().min(0).optional(),
    }).optional(),
    carryOver: z.object({
      vacation: z.number().min(0).max(10).optional(),
      personal: z.number().min(0).max(5).optional(),
    }).optional(),
  }),
});

const createTimeOffPolicyValidationSchema = z.object({
  body: z.object({
    department: z.string().min(2, 'Department name is required'),
    role: z.string().optional(),
    location: z.string().optional(),
    annualVacationDays: z.number().min(0).max(50).default(25),
    annualSickDays: z.number().min(0).max(30).default(10),
    annualPersonalDays: z.number().min(0).max(15).default(5),
    maxConsecutiveDays: z.number().min(1).max(30).default(15),
    minAdvanceNotice: z.number().min(0).max(90).default(7),
    maxCarryOver: z.number().min(0).max(15).default(5),
    requiresApproval: z.boolean().default(true),
    blackoutDates: z.array(z.string().refine((date) => !isNaN(Date.parse(date)))).optional(),
    emergencyBypass: z.boolean().default(true),
  }),
});

const analyticsQueryValidationSchema = z.object({
  query: z.object({
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date format',
    }).optional(),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end date format',
    }).optional(),
    department: z.string().optional(),
    year: z.string().refine((year) => !isNaN(Number(year)) && Number(year) > 2000, {
      message: 'Invalid year',
    }).optional(),
    type: z.enum([
      TIME_OFF_TYPE.VACATION,
      TIME_OFF_TYPE.SICK,
      TIME_OFF_TYPE.PERSONAL,
      TIME_OFF_TYPE.EMERGENCY,
      TIME_OFF_TYPE.BEREAVEMENT,
      TIME_OFF_TYPE.MATERNITY,
      TIME_OFF_TYPE.PATERNITY,
    ] as const).optional(),
  }),
});

export const TimeOffValidations = {
  createTimeOffValidationSchema,
  updateTimeOffValidationSchema,
  reviewTimeOffValidationSchema,
  timeOffQueryValidationSchema,
  updateBalanceValidationSchema,
  createTimeOffPolicyValidationSchema,
  analyticsQueryValidationSchema,
};