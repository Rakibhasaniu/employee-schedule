
export const TIME_OFF_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export const TIME_OFF_TYPE = {
  VACATION: 'vacation',
  SICK: 'sick',
  PERSONAL: 'personal',
  EMERGENCY: 'emergency',
  BEREAVEMENT: 'bereavement',
  MATERNITY: 'maternity',
  PATERNITY: 'paternity',
} as const;

export const TIME_OFF_SEARCHABLE_FIELDS = [
  'reason',
  'reviewNotes',
  'employee.name.firstName',
  'employee.name.lastName',
  'employee.department',
];

export const TIME_OFF_FILTERABLE_FIELDS = [
  'status',
  'type',
  'employee',
  'department',
  'isEmergency',
  'startDate',
  'endDate',
];

export const DEFAULT_TIME_OFF_POLICY = {
  VACATION_DAYS: 25,
  SICK_DAYS: 10,
  PERSONAL_DAYS: 5,
  MAX_CONSECUTIVE_DAYS: 15,
  MIN_ADVANCE_NOTICE: 7,
  MAX_CARRY_OVER: 5,
};

export const TIME_OFF_VALIDATION_RULES = {
  MIN_REQUEST_DURATION: 0.5, // Half day minimum
  MAX_REQUEST_DURATION: 365, // One year maximum
  MIN_REASON_LENGTH: 10,
  MAX_REASON_LENGTH: 500,
  MAX_ATTACHMENT_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
} as const;