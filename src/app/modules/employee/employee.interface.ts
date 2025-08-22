// modules/Employee/employee.interface.ts
import { Types } from 'mongoose';

export interface TEmployee {
  _id?: Types.ObjectId;
  id: string;
  name: {
    firstName: string;
    lastName: string;
  };
  email: string;
  phone: string;
  role: string;
  department: string;
  location: string;
  skills: string[];
  availability: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  profileImg?: string;
  user: Types.ObjectId;
  isDeleted: boolean;
}