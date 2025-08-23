import { Router } from 'express';
import { AuthRoutes } from '../modules/Auth/auth.route';
import { EmployeeRoutes } from '../modules/employee/employee.route';
import { ScheduleRoutes } from '../modules/schedule/schedule.routes';
import { TimeOffRoutes } from '../modules/timeOff/timeOff.route';
import { ShiftRoutes } from '../modules/shift/shift.route';
import { ShiftTemplateRoutes } from '../modules/shiftTemplate/shiftTemplate.route';


const router = Router();

const moduleRoutes = [
  
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/employees',
    route: EmployeeRoutes,
  },
  {
    path: '/schedules',
    route: ScheduleRoutes,
  },
  {
    path: '/timeoff',
    route: TimeOffRoutes,
  },
  {
    path: '/shifts',
    route: ShiftRoutes,
  },
  {
    path: '/shift-templates',
    route: ShiftTemplateRoutes,
  },
 
 
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
