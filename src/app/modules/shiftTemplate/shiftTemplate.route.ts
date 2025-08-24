import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { USER_ROLE } from '../User/user.constant';
import { ShiftTemplateControllers } from './shiftTemplate.controller';
import { ShiftTemplateValidations } from './shiftTemplate.validation';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftTemplateValidations.createShiftTemplateValidationSchema),
  ShiftTemplateControllers.createShiftTemplate,
);

router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftTemplateControllers.getAllShiftTemplates,
);

router.get(
  '/department/:department',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftTemplateValidations.departmentValidationSchema),
  ShiftTemplateControllers.getTemplatesByDepartment,
);

router.post(
  '/:templateId/generate-shifts',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftTemplateValidations.generateShiftsValidationSchema),
  ShiftTemplateControllers.generateShiftsFromTemplate,
);

router.get(
  '/:templateId/analytics',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(ShiftTemplateValidations.templateAnalyticsValidationSchema),
  ShiftTemplateControllers.getTemplateUsageAnalytics,
);

router.patch(
  '/:id/activate',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftTemplateControllers.activateTemplate,
);

router.patch(
  '/:id/deactivate',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  ShiftTemplateControllers.deactivateTemplate,
);

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