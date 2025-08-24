// modules/Shift/shift.model.ts
import { Schema, model } from 'mongoose';
import { TShift } from './shift.interface';

const shiftSchema = new Schema<TShift>({
  scheduleId: {
    type: Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true,
  },
  employee: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  endTime: {
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  },
  shiftType: {
    type: String,
    enum: ['morning', 'afternoon', 'night', 'full-day'],
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  requiredSkills: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  notes: {
    type: String,
  },
  breakDuration: {
    type: Number,
    default: 0,
    min: 0,
  },
  isTimeOff: {
    type: Boolean,
    default: false,
  },
  timeOffReason: {
    type: String,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
}, { 
  timestamps: true,
  // Add virtual for duration calculation
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for shift duration in hours
shiftSchema.virtual('duration').get(function() {
  const start = new Date(`1970-01-01T${this.startTime}`);
  const end = new Date(`1970-01-01T${this.endTime}`);
  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.max(0, duration - (this.breakDuration || 0) / 60);
});

// Indexes for performance
shiftSchema.index({ employee: 1, date: 1 });
shiftSchema.index({ scheduleId: 1 });
shiftSchema.index({ date: 1, location: 1 });
shiftSchema.index({ status: 1 });
shiftSchema.index({ shiftType: 1 });
shiftSchema.index({ role: 1 });
shiftSchema.index({ createdBy: 1 });

// Compound indexes for aggregation queries
shiftSchema.index({ date: 1, location: 1, role: 1 });
shiftSchema.index({ employee: 1, date: 1, status: 1 });

// Query middleware for soft delete
shiftSchema.pre('find', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

shiftSchema.pre('findOne', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

shiftSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

// Validation middleware
shiftSchema.pre('save', function(next) {
  const start = new Date(`1970-01-01T${this.startTime}`);
  const end = new Date(`1970-01-01T${this.endTime}`);
  
  if (start >= end) {
    next(new Error('Start time must be before end time'));
    return;
  }
  
  next();
});

export const Shift = model<TShift>('Shift', shiftSchema);