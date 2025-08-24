import { Schema, model } from 'mongoose';
import { TSchedule, TShift, TCoverage, TConflict } from './schedule.interface';

const shiftSchema = new Schema<TShift>({
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
  notes: {
    type: String,
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
}, { timestamps: true });

const coverageSchema = new Schema<TCoverage>({
  location: { 
    type: String, 
    required: true 
  },
  requiredStaff: { 
    type: Number, 
    required: true,
    min: 1,
  },
  assignedStaff: { 
    type: Number, 
    default: 0,
    min: 0,
  },
  coveragePercentage: { 
    type: Number, 
    default: 0,
    min: 0,
    // max: 100,
  },
  shifts: [shiftSchema],
}, { _id: false });

const conflictSchema = new Schema<TConflict>({
  type: {
    type: String,
    enum: ['overlap', 'double-booking', 'unavailable', 'overtime'],
    required: true,
  },
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  conflictingShifts: [{
    type: Schema.Types.ObjectId,
    ref: 'Shift',
  }],
  resolved: {
    type: Boolean,
    default: false,
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  resolvedAt: {
    type: Date,
  },
}, { timestamps: true });

const scheduleSchema = new Schema<TSchedule>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    weekEndDate: {
      type: Date,
      required: true,
    },
    shifts: [shiftSchema],
    status: {
      type: String,
      enum: ['draft', 'published', 'completed'],
      default: 'draft',
    },
    totalEmployees: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    coverage: [coverageSchema],
    conflicts: [conflictSchema],
    publishedAt: {
      type: Date,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
scheduleSchema.index({ weekStartDate: 1, weekEndDate: 1 });
scheduleSchema.index({ status: 1 });
scheduleSchema.index({ createdBy: 1 });
scheduleSchema.index({ 'shifts.employee': 1 });
scheduleSchema.index({ 'shifts.date': 1 });

// Middleware to calculate totals before saving
scheduleSchema.pre('save', function (next) {
  // Calculate total employees
  this.totalEmployees = new Set(this.shifts.map(shift => shift.employee.toString())).size;
  
  // Calculate total hours
  this.totalHours = this.shifts.reduce((total, shift) => {
    const start = new Date(`1970-01-01T${shift.startTime}`);
    const end = new Date(`1970-01-01T${shift.endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);

  // Update coverage percentages
  this.coverage.forEach(cov => {
    cov.assignedStaff = cov.shifts.length;
    cov.coveragePercentage = cov.requiredStaff > 0 
      ? Math.round((cov.assignedStaff / cov.requiredStaff) * 100) 
      : 0;
  });

  next();
});

// Query middleware for soft delete
scheduleSchema.pre('find', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

scheduleSchema.pre('findOne', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

scheduleSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

export const Schedule = model<TSchedule>('Schedule', scheduleSchema);