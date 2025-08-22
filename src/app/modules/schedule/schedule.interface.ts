// modules/Schedule/schedule.interface.ts
import { Types } from 'mongoose';

export type TShiftType = 'morning' | 'afternoon' | 'night' | 'full-day';
export type TScheduleStatus = 'draft' | 'published' | 'completed';

export interface TShift {
  _id?: Types.ObjectId;
  employee: Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  shiftType: TShiftType;
  location: string;
  role: string;
  notes?: string;
  isTimeOff?: boolean;
  timeOffReason?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

export interface TCoverage {
  location: string;
  requiredStaff: number;
  assignedStaff: number;
  coveragePercentage: number;
  shifts: TShift[];
}

export interface TConflict {
  type: 'overlap' | 'double-booking' | 'unavailable' | 'overtime';
  employeeId: Types.ObjectId;
  employeeName: string;
  description: string;
  conflictingShifts: Types.ObjectId[];
  resolved: boolean;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
}

export interface TSchedule {
  _id?: Types.ObjectId;
  title: string;
  weekStartDate: Date;
  weekEndDate: Date;
  shifts: TShift[];
  status: TScheduleStatus;
  totalEmployees: number;
  totalHours: number;
  coverage: TCoverage[];
  conflicts: TConflict[];
  publishedAt?: Date;
  publishedBy?: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
}