// modules/TimeOff/timeoff.model.ts

import { Schema, model } from 'mongoose';
import { TTimeOffRequest, TTimeOffBalance, TTimeOffPolicy } from './timeoff.interface';
import { TIME_OFF_STATUS, TIME_OFF_TYPE } from './timeoff.constant';

// Time Off Request Schema
const timeOffRequestSchema = new Schema<TTimeOffRequest>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    type: {
      type: String,
      enum: Object.values(TIME_OFF_TYPE),
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
      max: 365,
    },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(TIME_OFF_STATUS),
      default: TIME_OFF_STATUS.PENDING,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    attachments: [{
      type: String,
      trim: true,
    }],
    isEmergency: {
      type: Boolean,
      default: false,
    },
    conflictingShifts: [{
      type: Schema.Types.ObjectId,
      ref: 'Schedule',
    }],
    replacementEmployee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for duration calculation
timeOffRequestSchema.virtual('durationInDays').get(function() {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
});

// Virtual for status display
timeOffRequestSchema.virtual('statusDisplay').get(function() {
  return this.status.charAt(0).toUpperCase() + this.status.slice(1);
});

// Indexes for performance
timeOffRequestSchema.index({ employee: 1, startDate: -1 });
timeOffRequestSchema.index({ status: 1, createdAt: -1 });
timeOffRequestSchema.index({ type: 1, startDate: 1, endDate: 1 });
timeOffRequestSchema.index({ reviewedBy: 1, reviewedAt: -1 });

// Query middleware
timeOffRequestSchema.pre(/^find/, function(next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Time Off Balance Schema
const timeOffBalanceSchema = new Schema<TTimeOffBalance>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
      unique: true,
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },
    vacation: {
      allocated: { type: Number, default: 25, min: 0 },
      used: { type: Number, default: 0, min: 0 },
      pending: { type: Number, default: 0, min: 0 },
      remaining: { type: Number, default: 25, min: 0 },
    },
    sick: {
      allocated: { type: Number, default: 10, min: 0 },
      used: { type: Number, default: 0, min: 0 },
      pending: { type: Number, default: 0, min: 0 },
      remaining: { type: Number, default: 10, min: 0 },
    },
    personal: {
      allocated: { type: Number, default: 5, min: 0 },
      used: { type: Number, default: 0, min: 0 },
      pending: { type: Number, default: 0, min: 0 },
      remaining: { type: Number, default: 5, min: 0 },
    },
    carryOver: {
      vacation: { type: Number, default: 0, min: 0, max: 10 },
      personal: { type: Number, default: 0, min: 0, max: 5 },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for employee and year
timeOffBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

// Virtual for total allocated days
timeOffBalanceSchema.virtual('totalAllocated').get(function() {
  return this.vacation.allocated + this.sick.allocated + this.personal.allocated;
});

// Virtual for total used days
timeOffBalanceSchema.virtual('totalUsed').get(function() {
  return this.vacation.used + this.sick.used + this.personal.used;
});

// Time Off Policy Schema
const timeOffPolicySchema = new Schema<TTimeOffPolicy>(
  {
    department: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    annualVacationDays: {
      type: Number,
      required: true,
      min: 0,
      max: 50,
      default: 25,
    },
    annualSickDays: {
      type: Number,
      required: true,
      min: 0,
      max: 30,
      default: 10,
    },
    annualPersonalDays: {
      type: Number,
      required: true,
      min: 0,
      max: 15,
      default: 5,
    },
    maxConsecutiveDays: {
      type: Number,
      default: 15,
      min: 1,
      max: 30,
    },
    minAdvanceNotice: {
      type: Number,
      default: 7,
      min: 0,
      max: 90,
    },
    maxCarryOver: {
      type: Number,
      default: 5,
      min: 0,
      max: 15,
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    blackoutDates: [{
      type: Date,
    }],
    emergencyBypass: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for policy lookup
timeOffPolicySchema.index({ department: 1, role: 1, location: 1, isActive: 1 });

export const TimeOffRequest = model<TTimeOffRequest>('TimeOffRequest', timeOffRequestSchema);
export const TimeOffBalance = model<TTimeOffBalance>('TimeOffBalance', timeOffBalanceSchema);
export const TimeOffPolicy = model<TTimeOffPolicy>('TimeOffPolicy', timeOffPolicySchema);