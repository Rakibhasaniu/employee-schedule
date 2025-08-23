import { Router } from 'express';
import { AuthRoutes } from '../modules/Auth/auth.route';
import { EmployeeRoutes } from '../modules/employee/employee.route';
import { ScheduleRoutes } from '../modules/schedule/schedule.routes';
import { TimeOffRoutes } from '../modules/timeOff/timeOff.route';


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
 
 
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
