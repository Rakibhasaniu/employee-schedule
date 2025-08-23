// modules/Schedule/schedule.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { ScheduleControllers } from './schedule.controller';
import { ScheduleValidations } from './schedule.validation';

const router = express.Router();


router.post(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ScheduleValidations.createScheduleValidationSchema),
  ScheduleControllers.createSchedule,
);

router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ScheduleControllers.getAllSchedules,
);

router.get(
  '/date-range',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ScheduleValidations.dateRangeValidationSchema),
  ScheduleControllers.getScheduleByDateRange,
);

router.get(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ScheduleControllers.getSingleSchedule,
);

router.patch(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ScheduleValidations.updateScheduleValidationSchema),
  ScheduleControllers.updateSchedule,
);

router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ScheduleControllers.deleteSchedule,
);

router.post(
  '/:scheduleId/assign-shift',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ScheduleValidations.assignShiftValidationSchema),
  ScheduleControllers.assignShift,
);

router.patch(
  '/:id/publish',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ScheduleControllers.publishSchedule,
);

router.get(
  '/employee/:employeeId',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  // validateRequest(ScheduleValidations.dateRangeValidationSchema),
  ScheduleControllers.getEmployeeSchedules,
);


router.get(
  '/me/schedule',
  auth(USER_ROLE.employee),
  // validateRequest(ScheduleValidations.dateRangeValidationSchema),
  ScheduleControllers.getMySchedule,
);

export const ScheduleRoutes = router;