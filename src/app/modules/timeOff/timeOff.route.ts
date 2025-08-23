
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { TimeOffValidations } from './timeOff.validation';
import { TimeOffControllers } from './timeOff.controller';


const router = express.Router();


router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  // validateRequest(TimeOffValidations.timeOffQueryValidationSchema),
  TimeOffControllers.getAllTimeOffRequests
);

router.get(
  '/analytics',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(TimeOffValidations.analyticsQueryValidationSchema),
  TimeOffControllers.getTimeOffAnalytics
);

router.get(
  '/calendar',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(TimeOffValidations.timeOffQueryValidationSchema),
  TimeOffControllers.getTimeOffCalendar
);

router.post(
  '/bulk-approve',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  TimeOffControllers.bulkApproveTimeOffRequests
);

router.get(
  '/employee/:employeeId/balance',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  TimeOffControllers.getEmployeeBalance
);

router.get(
  '/employee/:employeeId/summary',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  TimeOffControllers.getEmployeeTimeOffSummary
);

router.get(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.employee),
  TimeOffControllers.getSingleTimeOffRequest
);

router.patch(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.employee),
  validateRequest(TimeOffValidations.updateTimeOffValidationSchema),
  TimeOffControllers.updateTimeOffRequest
);

router.patch(
  '/:id/review',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(TimeOffValidations.reviewTimeOffValidationSchema),
  TimeOffControllers.reviewTimeOffRequest
);

router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.employee),
  TimeOffControllers.deleteTimeOffRequest
);

// ====== EMPLOYEE SELF-SERVICE ROUTES ======

router.post(
  '/create',
  auth(USER_ROLE.employee, USER_ROLE.admin, USER_ROLE.superAdmin),
  validateRequest(TimeOffValidations.createTimeOffValidationSchema),
  TimeOffControllers.createTimeOffRequest
);

router.get(
  '/me/requests',
  auth(USER_ROLE.employee),
  validateRequest(TimeOffValidations.timeOffQueryValidationSchema),
  TimeOffControllers.getMyTimeOffRequests
);

router.get(
  '/me/balance',
  auth(USER_ROLE.employee),
  TimeOffControllers.getMyTimeOffBalance
);

router.get(
  '/me/summary',
  auth(USER_ROLE.employee),
  TimeOffControllers.getMyTimeOffSummary
);

export const TimeOffRoutes = router;