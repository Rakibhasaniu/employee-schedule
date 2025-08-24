import { TIME_OFF_TYPE } from "./timeOff.constant";
import { TTimeOffType } from "./timeOff.interface";

export const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

export const calculateCalendarDays = (startDate: Date, endDate: Date): number => {
  const timeDiff = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
};

export const isWeekend = (date: Date): boolean => {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; 
};


export const isHoliday = (date: Date, holidays: Date[]): boolean => {
  return holidays.some(holiday => 
    holiday.toDateString() === date.toDateString()
  );
};


export const getNextBusinessDay = (date: Date): Date => {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  while (isWeekend(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
};


export const formatTimeOffDuration = (days: number): string => {
  if (days < 1) {
    return `${days * 8} hours`;
  } else if (days === 1) {
    return '1 day';
  } else {
    return `${days} days`;
  }
};


export const getTimeOffTypeDisplay = (type: TTimeOffType): string => {
  const displayNames: Record<TTimeOffType, string> = {
    [TIME_OFF_TYPE.VACATION]: 'Vacation',
    [TIME_OFF_TYPE.SICK]: 'Sick Leave',
    [TIME_OFF_TYPE.PERSONAL]: 'Personal Leave',
    [TIME_OFF_TYPE.EMERGENCY]: 'Emergency Leave',
    [TIME_OFF_TYPE.BEREAVEMENT]: 'Bereavement Leave',
    [TIME_OFF_TYPE.MATERNITY]: 'Maternity Leave',
    [TIME_OFF_TYPE.PATERNITY]: 'Paternity Leave',
  };
  
  return displayNames[type] || type;
};


export const getTimeOffTypeColor = (type: TTimeOffType): string => {
  const colors: Record<TTimeOffType, string> = {
    [TIME_OFF_TYPE.VACATION]: '#3498db',      // Blue
    [TIME_OFF_TYPE.SICK]: '#e74c3c',          // Red
    [TIME_OFF_TYPE.PERSONAL]: '#f39c12',      // Orange
    [TIME_OFF_TYPE.EMERGENCY]: '#e67e22',     // Dark Orange
    [TIME_OFF_TYPE.BEREAVEMENT]: '#34495e',   // Dark Gray
    [TIME_OFF_TYPE.MATERNITY]: '#e91e63',     // Pink
    [TIME_OFF_TYPE.PATERNITY]: '#9c27b0',     // Purple
  };
  
  return colors[type] || '#95a5a6'; //  gray
};


export const validateAdvanceNotice = (
  startDate: Date,
  minAdvanceNoticeDays: number,
  isEmergency: boolean = false
): { isValid: boolean; message?: string } => {
  if (isEmergency) {
    return { isValid: true };
  }
  
  const today = new Date();
  const daysDiff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  if (daysDiff < minAdvanceNoticeDays) {
    return {
      isValid: false,
      message: `Time-off requests require at least ${minAdvanceNoticeDays} days advance notice`
    };
  }
  
  return { isValid: true };
};


export const hasBlackoutDateConflict = (
  startDate: Date,
  endDate: Date,
  blackoutDates: Date[]
): { hasConflict: boolean; conflictDates?: Date[] } => {
  const conflictDates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const hasConflict = blackoutDates.some(blackout => 
      blackout.toDateString() === current.toDateString()
    );
    
    if (hasConflict) {
      conflictDates.push(new Date(current));
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return {
    hasConflict: conflictDates.length > 0,
    conflictDates: conflictDates.length > 0 ? conflictDates : undefined
  };
};


export const generateDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};


export const calculateAvailableBalance = (
  allocated: number,
  used: number,
  pending: number
): number => {
  return Math.max(0, allocated - used - pending);
};


export const formatBalance = (balance: {
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
}): string => {
  return `${balance.remaining} available (${balance.used} used, ${balance.pending} pending) of ${balance.allocated} allocated`;
};


export const canTakeTimeOff = (
  requestedDays: number,
  balance: { remaining: number; pending: number },
  isEmergency: boolean = false
): { canTake: boolean; reason?: string } => {
  if (isEmergency) {
    return { canTake: true };
  }
  
  const availableDays = balance.remaining;
  
  if (requestedDays > availableDays) {
    return {
      canTake: false,
      reason: `Insufficient balance. You have ${availableDays} days remaining.`
    };
  }
  
  return { canTake: true };
};


export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: '#f39c12',    // Orange
    approved: '#27ae60',   // Green
    rejected: '#e74c3c',   // Red
    cancelled: '#95a5a6',  // Gray
  };
  
  return colors[status] || '#95a5a6';
};


export const calculateProcessingTime = (
  createdAt: Date,
  reviewedAt: Date | null
): number | null => {
  if (!reviewedAt) return null;
  
  return calculateBusinessDays(createdAt, reviewedAt);
};


export const getUpcomingHolidays = (year: number): Date[] => {
 
  return [
    new Date(year, 0, 1),  
    new Date(year, 6, 4),   
    new Date(year, 11, 25), 
  ];
};


export const validateDateRange = (
  startDate: Date,
  endDate: Date,
  maxConsecutiveDays: number
): { isValid: boolean; message?: string } => {
  if (startDate > endDate) {
    return {
      isValid: false,
      message: 'End date must be after start date'
    };
  }
  
  const days = calculateCalendarDays(startDate, endDate);
  
  if (days > maxConsecutiveDays) {
    return {
      isValid: false,
      message: `Cannot request more than ${maxConsecutiveDays} consecutive days`
    };
  }
  
  return { isValid: true };
};