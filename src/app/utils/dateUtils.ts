import { TEmployee } from "../modules/employee/employee.interface";

// utils/dateUtils.ts
export const getDayName = (date: Date): keyof TEmployee['availability'] => {
  const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(day)) {
    return day as keyof TEmployee['availability'];
  }
  return 'monday'; // fallback
};

export const generateDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
};

export const calculateShiftDuration = (startTime: string, endTime: string): number => {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = endHours * 60 + endMinutes;
  
  let durationMinutes = endTotalMinutes - startTotalMinutes;
  
  // Handle overnight shifts
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }
  
  return durationMinutes / 60; // Return hours
};