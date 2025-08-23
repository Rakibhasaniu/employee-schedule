// modules/Employee/employee.model.ts
import { Schema, model } from 'mongoose';
import { TEmployee } from './employee.interface';

const availabilitySchema = new Schema({
  start: { type: String, default: '09:00' },
  end: { type: String, default: '17:00' },
  available: { type: Boolean, default: true }
}, { _id: false });

const employeeSchema = new Schema<TEmployee>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 20,
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    skills: [{
      type: String,
      trim: true,
    }],
    availability: {
      monday: availabilitySchema,
      tuesday: availabilitySchema,
      wednesday: availabilitySchema,
      thursday: availabilitySchema,
      friday: availabilitySchema,
      saturday: availabilitySchema,
      sunday: availabilitySchema,
    },
    profileImg: {
      type: String,
    },
    user: {
      type: Schema.Types.ObjectId,
      required: true,
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

employeeSchema.pre('find', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

employeeSchema.pre('findOne', function (next) {
  this.find({ isDeleted: { $ne: true } });
  next();
});

employeeSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

export const Employee = model<TEmployee>('Employee', employeeSchema);