// modules/ShiftTemplate/shiftTemplate.model.ts
import { Schema, model } from 'mongoose';

export interface TShiftTemplate {
  _id?: Schema.Types.ObjectId;
  name: string;
  description?: string;
  department: string;
  location: string;
  defaultShift: {
    startTime: string;
    endTime: string;
    shiftType: 'morning' | 'afternoon' | 'night' | 'full-day';
    role: string;
    requiredSkills: string[];
    breakDuration?: number;
  };
  recurrencePattern: {
    type: 'daily' | 'weekly' | 'monthly';
    days?: string[]; // ['monday', 'tuesday'] for weekly
    interval?: number; // Every X days/weeks/months
    endDate?: Date;
  };
  isActive: boolean;
  createdBy: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  isDeleted: boolean;
}

const shiftTemplateSchema = new Schema<TShiftTemplate>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  department: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  defaultShift: {
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
    role: {
      type: String,
      required: true,
    },
    requiredSkills: [{
      type: String,
    }],
    breakDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  recurrencePattern: {
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    }],
    interval: {
      type: Number,
      default: 1,
      min: 1,
    },
    endDate: {
      type: Date,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
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
  timestamps: true 
});

// Indexes
shiftTemplateSchema.index({ department: 1, location: 1 });
shiftTemplateSchema.index({ isActive: 1 });
shiftTemplateSchema.index({ createdBy: 1 });

// Query middleware for soft delete
shiftTemplateSchema.pre('find', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

shiftTemplateSchema.pre('findOne', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

// Validation middleware
shiftTemplateSchema.pre('save', function(next) {
  // Validate start time is before end time
  const start = new Date(`1970-01-01T${this.defaultShift.startTime}`);
  const end = new Date(`1970-01-01T${this.defaultShift.endTime}`);
  
  if (start >= end) {
    next(new Error('Start time must be before end time'));
    return;
  }
  
  // Validate recurrence pattern
  if (this.recurrencePattern.type === 'weekly' && (!this.recurrencePattern.days || this.recurrencePattern.days.length === 0)) {
    next(new Error('Weekly recurrence requires at least one day'));
    return;
  }
  
  next();
});

export const ShiftTemplate = model<TShiftTemplate>('ShiftTemplate', shiftTemplateSchema);