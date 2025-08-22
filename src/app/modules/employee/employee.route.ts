// modules/Employee/employee.route.ts
import express from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { EmployeeControllers } from './employee.controller';
import { EmployeeValidations } from './employee.validation';
import { USER_ROLE } from '../../utils/user.constant';

const router = express.Router();

// ====== ADMIN/SUPER ADMIN ROUTES ======

// Create employee (Admin/Super Admin only)
router.post(
  '/create-employee',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),  
  validateRequest(EmployeeValidations.createEmployeeValidationSchema),
  EmployeeControllers.createEmployee,
);

// Get all employees (Admin/Super Admin only)
router.get(
  '/',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  EmployeeControllers.getAllEmployees,
);

// Search employees by skills (Admin/Super Admin only)
router.get(
  '/search-by-skills',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  EmployeeControllers.searchEmployeesBySkills,
);

// Get single employee by ID (Admin/Super Admin only)
router.get(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  EmployeeControllers.getSingleEmployee,
);

// Get employee by user ID (Admin/Super Admin only)
router.get(
  '/user/:userId',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  EmployeeControllers.getEmployeeByUserId,
);

// Update employee (Admin/Super Admin only)
router.patch(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(EmployeeValidations.updateEmployeeValidationSchema),
  EmployeeControllers.updateEmployee,
);

// Delete employee (Admin/Super Admin only)
router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  EmployeeControllers.deleteEmployee,
);

// ====== EMPLOYEE AVAILABILITY MANAGEMENT ======

// Get employee availability (Admin/Super Admin only)
router.get(
  '/:employeeId/availability',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  EmployeeControllers.getEmployeeAvailability,
);

// Update employee availability (Admin/Super Admin only)
router.patch(
  '/:employeeId/availability',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  validateRequest(EmployeeValidations.updateAvailabilityValidationSchema),
  EmployeeControllers.updateEmployeeAvailability,
);

// ====== EMPLOYEE SELF-SERVICE ROUTES ======

// Get my profile (Employee can view own profile)
router.get(
  '/me/profile',
  auth(USER_ROLE.employee),
  EmployeeControllers.getMe,
);

// Update my profile (Employee can update own profile)
router.patch(
  '/me/profile',
  auth(USER_ROLE.employee),
  validateRequest(EmployeeValidations.updateEmployeeValidationSchema),
  EmployeeControllers.updateMyProfile,
);

// Update my availability (Employee can update own availability)
router.patch(
  '/me/availability',
  auth(USER_ROLE.employee),
  validateRequest(EmployeeValidations.updateAvailabilityValidationSchema),
  EmployeeControllers.updateMyAvailability,
);

export const EmployeeRoutes = router;