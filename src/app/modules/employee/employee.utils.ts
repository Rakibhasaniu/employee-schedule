// modules/Employee/employee.utils.ts
import { User } from '../User/user.model';

const findLastEmployeeId = async () => {
  const lastEmployee = await User.findOne(
    { role: 'employee' },
    { id: 1, _id: 0 },
  )
    .sort({ createdAt: -1 })
    .lean();

  return lastEmployee?.id ? lastEmployee.id.substring(2) : undefined;
};

export const generateEmployeeId = async () => {
  let currentId = (0).toString();
  const lastEmployeeId = await findLastEmployeeId();

  if (lastEmployeeId) {
    currentId = lastEmployeeId;
  }

  let incrementId = (Number(currentId) + 1).toString().padStart(4, '0');
  incrementId = `E-${incrementId}`;

  return incrementId;
};

// Generate User ID for different roles
const findLastUserId = async (role: string) => {
  const lastUser = await User.findOne(
    { role },
    { id: 1, _id: 0 },
  )
    .sort({ createdAt: -1 })
    .lean();

  return lastUser?.id ? lastUser.id : undefined;
};

export const generateUserId = async (role: 'superAdmin' | 'admin' | 'employee') => {
  let currentId = (0).toString();
  let prefix = '';
  
  switch (role) {
    case 'superAdmin':
      prefix = 'SA-';
      break;
    case 'admin':
      prefix = 'A-';
      break;
    case 'employee':
      prefix = 'E-';
      break;
    default:
      prefix = 'U-';
  }

  const lastUserId = await findLastUserId(role);
  
  if (lastUserId) {
    const lastNumber = lastUserId.substring(prefix.length);
    currentId = lastNumber;
  }

  let incrementId = (Number(currentId) + 1).toString().padStart(4, '0');
  incrementId = `${prefix}${incrementId}`;

  return incrementId;
};