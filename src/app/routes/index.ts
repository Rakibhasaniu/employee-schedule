import { Router } from 'express';
import { AuthRoutes } from '../modules/Auth/auth.route';
import { EmployeeRoutes } from '../modules/employee/employee.route';


const router = Router();

const moduleRoutes = [
  
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/employees',
    route: EmployeeRoutes,
  }
 
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
