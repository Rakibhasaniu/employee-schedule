// modules/Shift/shift.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { ShiftControllers } from './shift.controller';
import { ShiftValidations } from './shift.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftValidations.createShiftValidationSchema),
  ShiftControllers.createShift,
);

// Get all shifts
router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftControllers.getAllShifts,
);

// Analytics and aggregation endpoints
router.get(
  '/coverage',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftValidations.shiftCoverageValidationSchema),
  ShiftControllers.getShiftCoverage,
);

router.get(
  '/workload-analysis',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftValidations.dateRangeValidationSchema),
  ShiftControllers.getEmployeeWorkload,
);

router.get(
  '/detect-conflicts',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftValidations.dateRangeValidationSchema),
  ShiftControllers.detectConflicts,
);

router.get(
  '/employee/:employeeId',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftValidations.employeeShiftsValidationSchema),
  ShiftControllers.getEmployeeShifts,
);

router.get(
  '/me/shifts',
  auth(USER_ROLE.employee),
  validateRequest(ShiftValidations.dateRangeValidationSchema),
  ShiftControllers.getMyShifts,
);

// Single shift operations
router.get(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin, USER_ROLE.employee),
  ShiftControllers.getSingleShift,
);

router.patch(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftValidations.updateShiftValidationSchema),
  ShiftControllers.updateShift,
);

router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftControllers.deleteShift,
);

export const ShiftRoutes = router;