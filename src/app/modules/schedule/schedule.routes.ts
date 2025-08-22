// modules/Schedule/schedule.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { ScheduleControllers } from './schedule.controller';
import { ScheduleValidations } from './schedule.validation';

const router = express.Router();

// ====== ADMIN/SUPER ADMIN ROUTES ======

// Create schedule
router.post(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ScheduleValidations.createScheduleValidationSchema),
  ScheduleControllers.createSchedule,
);

// Get all schedules
router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ScheduleControllers.getAllSchedules,
);

// Get schedules by date range
router.get(
  '/date-range',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ScheduleValidations.dateRangeValidationSchema),
  ScheduleControllers.getScheduleByDateRange,
);

// Get single schedule
router.get(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ScheduleControllers.getSingleSchedule,
);

// Update schedule
router.patch(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ScheduleValidations.updateScheduleValidationSchema),
  ScheduleControllers.updateSchedule,
);

// Delete schedule
router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ScheduleControllers.deleteSchedule,
);

// Assign shift to employee
router.post(
  '/:scheduleId/assign-shift',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ScheduleValidations.assignShiftValidationSchema),
  ScheduleControllers.assignShift,
);

// Publish schedule
router.patch(
  '/:id/publish',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ScheduleControllers.publishSchedule,
);

// Get employee schedules (Admin view)
router.get(
  '/employee/:employeeId',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ScheduleValidations.dateRangeValidationSchema),
  ScheduleControllers.getEmployeeSchedules,
);

// ====== EMPLOYEE SELF-SERVICE ROUTES ======

// Get my schedule (Employee view)
router.get(
  '/me/schedule',
  auth(USER_ROLE.employee),
  validateRequest(ScheduleValidations.dateRangeValidationSchema),
  ScheduleControllers.getMySchedule,
);

export const ScheduleRoutes = router;