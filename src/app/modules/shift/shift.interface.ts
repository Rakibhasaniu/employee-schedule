import { Types } from 'mongoose';

export type TShiftType = 'morning' | 'afternoon' | 'night' | 'full-day';
export type TShiftStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface TShift {
  _id?: Types.ObjectId;
  scheduleId: Types.ObjectId;
  employee: Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  shiftType: TShiftType;
  location: string;
  role: string;
  requiredSkills?: string[];
  status: TShiftStatus;
  notes?: string;
  breakDuration?: number; // in minutes
  isTimeOff?: boolean;
  timeOffReason?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isDeleted: boolean;
}

export interface TShiftCoverage {
  location: string;
  date: Date;
  totalShifts: number;
  totalHours: number;
  roleBreakdown: {
    role: string;
    count: number;
    employees: string[];
  }[];
}

export interface TEmployeeWorkload {
  employee: {
    _id: Types.ObjectId;
    name: string;
    email: string;
  };
  totalShifts: number;
  totalHours: number;
  avgHoursPerDay: number;
  shiftTypes: {
    morning: number;
    afternoon: number;
    night: number;
    'full-day': number;
  };
}

export interface TConflictAnalysis {
  employeeId: Types.ObjectId;
  employeeName: string;
  conflictType: string;
  conflictDate: Date;
  overlappingShifts: {
    shiftId: Types.ObjectId;
    startTime: string;
    endTime: string;
    location: string;
  }[];
}