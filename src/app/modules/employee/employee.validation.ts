import { z } from 'zod';

const timeSlotSchema = z.object({
  start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  available: z.boolean(),
});

const availabilitySchema = z.object({
  monday: timeSlotSchema.optional(),
  tuesday: timeSlotSchema.optional(),
  wednesday: timeSlotSchema.optional(),
  thursday: timeSlotSchema.optional(),
  friday: timeSlotSchema.optional(),
  saturday: timeSlotSchema.optional(),
  sunday: timeSlotSchema.optional(),
});

const createEmployeeValidationSchema = z.object({
  body: z.object({
    password: z.string().max(20).optional(),
    employee: z.object({
      name: z.object({
        firstName: z.string().min(1).max(20),
        lastName: z.string().min(1).max(20),
      }),
      email: z.string().email(),
      phone: z.string(),
      role: z.string(),
      department: z.string(),
      location: z.string(),
      skills: z.array(z.string()).optional(),
      availability: availabilitySchema.optional(),
    }),
  }),
});

const updateEmployeeValidationSchema = z.object({
  body: z.object({
    employee: z.object({
      name: z.object({
        firstName: z.string().min(1).max(20).optional(),
        lastName: z.string().min(1).max(20).optional(),
      }).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.string().optional(),
      department: z.string().optional(),
      location: z.string().optional(),
      skills: z.array(z.string()).optional(),
      availability: availabilitySchema.optional(),
    }),
  }),
});

const updateAvailabilityValidationSchema = z.object({
  body: z.object({
    availability: availabilitySchema,
  }),
});

export const EmployeeValidations = {
  createEmployeeValidationSchema,
  updateEmployeeValidationSchema,
  updateAvailabilityValidationSchema,
};