// modules/ShiftTemplate/shiftTemplate.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { ShiftTemplateControllers } from './shiftTemplate.controller';
import { ShiftTemplateValidations } from './shiftTemplate.validation';

const router = express.Router();

// Create shift template
router.post(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftTemplateValidations.createShiftTemplateValidationSchema),
  ShiftTemplateControllers.createShiftTemplate,
);

// Get all shift templates
router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftTemplateControllers.getAllShiftTemplates,
);

// Get templates by department
router.get(
  '/department/:department',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftTemplateValidations.departmentValidationSchema),
  ShiftTemplateControllers.getTemplatesByDepartment,
);

// Generate shifts from template
router.post(
  '/:templateId/generate-shifts',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftTemplateValidations.generateShiftsValidationSchema),
  ShiftTemplateControllers.generateShiftsFromTemplate,
);

// Get template usage analytics
router.get(
  '/:templateId/analytics',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftTemplateValidations.templateAnalyticsValidationSchema),
  ShiftTemplateControllers.getTemplateUsageAnalytics,
);

// Activate template
router.patch(
  '/:id/activate',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftTemplateControllers.activateTemplate,
);

// Deactivate template
router.patch(
  '/:id/deactivate',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftTemplateControllers.deactivateTemplate,
);

// Single template operations
router.get(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftTemplateControllers.getSingleShiftTemplate,
);

router.patch(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftTemplateValidations.updateShiftTemplateValidationSchema),
  ShiftTemplateControllers.updateShiftTemplate,
);

router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftTemplateControllers.deleteShiftTemplate,
);

export const ShiftTemplateRoutes = router;