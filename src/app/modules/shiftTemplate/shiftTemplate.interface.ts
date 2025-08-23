// modules/ShiftTemplate/shiftTemplate.interface.ts
import { Types } from 'mongoose';

export type TRecurrencePattern = {
  type: 'daily' | 'weekly' | 'monthly';
  days?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  interval?: number;
  endDate?: Date;
};

export type TDefaultShift = {
  startTime: string;
  endTime: string;
  shiftType: 'morning' | 'afternoon' | 'night' | 'full-day';
  role: string;
  requiredSkills: string[];
  breakDuration?: number;
};

export type TShiftTemplate = {
  name: string;
  description?: string;
  department: string;
  location: string;
  defaultShift: TDefaultShift;
  recurrencePattern: TRecurrencePattern;
  isActive: boolean;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type TShiftTemplateFilter = {
  searchTerm?: string;
  department?: string;
  location?: string;
  isActive?: boolean;
};