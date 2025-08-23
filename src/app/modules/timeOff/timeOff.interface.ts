
import { Document, Types } from 'mongoose';

export type TTimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TTimeOffType = 'vacation' | 'sick' | 'personal' | 'emergency' | 'bereavement' | 'maternity' | 'paternity';

export interface TTimeOffRequest extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  requestedBy: Types.ObjectId;
  type: TTimeOffType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: TTimeOffStatus;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewNotes?: string;
  attachments?: string[];
  isEmergency: boolean;
  conflictingShifts?: Types.ObjectId[];
  replacementEmployee?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface TTimeOffBalance extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  year: number;
  vacation: {
    allocated: number;
    used: number;
    pending: number;
    remaining: number;
  };
  sick: {
    allocated: number;
    used: number;
    pending: number;
    remaining: number;
  };
  personal: {
    allocated: number;
    used: number;
    pending: number;
    remaining: number;
  };
  carryOver: {
    vacation: number;
    personal: number;
  };
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TTimeOffPolicy extends Document {
  _id: Types.ObjectId;
  department: string;
  role?: string;
  location?: string;
  annualVacationDays: number;
  annualSickDays: number;
  annualPersonalDays: number;
  maxConsecutiveDays: number;
  minAdvanceNotice: number; 
  maxCarryOver: number;
  requiresApproval: boolean;
  blackoutDates?: Date[];
  emergencyBypass: boolean;
  createdBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateTimeOffRequest {
  type: TTimeOffType;
  startDate: string;
  endDate: string;
  reason: string;
  isEmergency?: boolean;
  attachments?: string[];
  replacementEmployee?: string;
}

export interface IUpdateTimeOffRequest {
  type?: TTimeOffType;
  startDate?: string;
  endDate?: string;
  reason?: string;
  attachments?: string[];
  replacementEmployee?: string;
}

export interface IReviewTimeOffRequest {
  status: 'approved' | 'rejected';
  reviewNotes?: string;
}

export interface ITimeOffQuery {
  employee?: string;
  department?: string;
  status?: TTimeOffStatus;
  type?: TTimeOffType;
  startDate?: string;
  endDate?: string;
  year?: number;
  isEmergency?: boolean;
}

export interface ITimeOffAnalytics {
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  averageProcessingTime: number;
  mostRequestedType: string;
  departmentBreakdown: {
    department: string;
    totalRequests: number;
    approvalRate: number;
  }[];
  monthlyTrends: {
    month: string;
    requests: number;
    approved: number;
  }[];
}

export interface IEmployeeTimeOffSummary {
  employee: {
    _id: Types.ObjectId;
    name: string;
    id: string;
    department: string;
  };
  balance: TTimeOffBalance;
  recentRequests: TTimeOffRequest[];
  upcomingTimeOff: TTimeOffRequest[];
  totalDaysThisYear: number;
}