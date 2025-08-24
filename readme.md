# Daily Scheduler - Employee Scheduling Management System

**Candidate:** [Your Name]  
**Position:** Node.js Developer (Mid)  
**Company:** Vista SysTech  
**Submission Date:** August 24, 2025  

## 🎯 **Project Overview**
A comprehensive workforce scheduling system built with Node.js, TypeScript, and MongoDB. The system provides advanced employee management, intelligent shift scheduling, conflict detection, and real-time analytics for enterprise workforce management.

## 🏗️ **Technology Stack**

- **Backend**: Node.js + TypeScript + Express.js
- **Database**: MongoDB + Mongoose ODM
- **Authentication**: JWT with role-based access control
- **Validation**: Zod schema validation
- **Error Handling**: Centralized error management
- **Query Building**: Custom QueryBuilder with aggregation pipelines

## 🚀 **Key Features Implemented**

### **Core Functionality**
- ✅ **Employee Management**: CRUD operations with skills and availability tracking
- ✅ **Schedule Management**: Week-based scheduling with coverage analytics
- ✅ **Shift Management**: Individual shift assignment with conflict detection
- ✅ **Shift Templates**: Recurring pattern automation with intelligent assignment
- ✅ **Time-Off Management**: Complete approval workflow with balance tracking

### **Advanced Features**
- ✅ **Real-time Conflict Detection**: Prevents overlapping shifts and double-booking
- ✅ **Coverage Analytics**: Location-based staffing gap analysis
- ✅ **MongoDB Aggregation**: Complex analytics and reporting pipelines
- ✅ **Employee Self-Service**: Profile and availability management
- ✅ **Business Intelligence**: Comprehensive dashboard-ready analytics

### **Enterprise Capabilities**
- ✅ **Role-Based Access Control**: SuperAdmin/Admin/Employee permissions
- ✅ **Multi-tenant Support**: Department and location-based organization
- ✅ **Audit Trails**: Complete activity tracking and compliance
- ✅ **Data Integrity**: Soft deletes and referential integrity

## 🛠️ **Setup Instructions**

### **1. Environment Setup**
```bash
# Clone the repository
git clone [your-repo-url]
cd employee-schedule

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### **2. Environment Variables**
```env
NODE_ENV= development
PORT=6000
# DATABASE_URL=mongodb+srv://schedule:admin123@cluster0.48q4yql.mongodb.net/employee-scheduler?retryWrites=true&w=majority&appName=Cluster0
DATABASE_URL=mongodb+srv://nizum:5kXPMsQBqhf65LZr@cluster0.4fphg1c.mongodb.net/schedule?retryWrites=true&w=majority&appName=Cluster0
BCRYPT_SALT_ROUNDS=12
JWT_ACCESS_SECRET = 091b2c529dec033b5ff4531e622ea3f93170e045222963319662b7e4a34f0cdd
JWT_REFRESH_SECRET = 41b991b21dc0a439cb45fed544992ba3fafa3f912d3c4dedebec3592d7d552fb74a86a4d69ea560bcf7bf988d173ddecaffa9815dd5a6661bcacd58c0cdb2dc5
JWT_ACCESS_EXPIRES_IN=10d
JWT_REFRESH_EXPIRES_IN=365d

```
## 👤 **Admin User Creation**

### **Step 1: Run the Seed Script**
```bash
# Using ts-node (recommended)
npx ts-node src/seedAdmin.ts

# Or using npm script (if added to package.json)
npm run seed:admin

# Or compile and run
npx tsc src/seedAdmin.ts --outDir dist
node dist/seedAdmin.js
```

### **Step 2: Expected Output**
```
✅ Connected to MongoDB (schedule database)
📋 Existing users: 0

🎉 Super Admin created successfully!
==========================================
👤 Admin Details:
ID: SA-0001
Email: superadmin@company.com
Role: superAdmin
Password: admin123
==========================================

🚀 Login Instructions:
URL: POST http://localhost:6000/api/v1/auth/login
Body: {"id": "SA-0001", "password": "admin123"}
```

### **Step 3: Start Application**
```bash
# Development mode
npm run start:dev


```
## 🧪 **Testing Workflow**

### **Phase 1: Authentication Setup**
1. **Admin Login**
   - Endpoint: `POST /api/v1/auth/login`
   - Credentials: `{"id": "SA-0001", "password": "admin123"}`
   - Get admin JWT token for subsequent requests

### **Phase 2: Employee Management**
2. **Create Employee**
   - Endpoint: `POST /api/v1/employees/create-employee`
   - Create employees with different skills and availability
   - Test role-based access control

3. **Employee Operations**
   - Get all employees with filtering and pagination
   - Search employees by skills and location
   - Update employee availability and profile information

### **Phase 3: Schedule & Shift Management**
4. **Create Schedule**
   - Endpoint: `POST /api/v1/schedules`
   - Create weekly schedules with multiple employees
   - Test automatic coverage calculation

5. **Shift Operations**
   - Create individual shifts with conflict detection
   - Test employee availability validation
   - Verify real-time conflict prevention

6. **Publish Schedule**
   - Endpoint: `PATCH /api/v1/schedules/{id}/publish`
   - Test business rule: cannot publish with unresolved conflicts
   - Verify status change workflow

### **Phase 4: Advanced Analytics**
7. **Coverage Analytics**
   - Endpoint: `GET /api/v1/shifts/coverage`
   - Test MongoDB aggregation for location-based coverage
   - Verify understaffing detection

8. **Workload Analysis**
   - Endpoint: `GET /api/v1/shifts/workload-analysis`
   - Test employee workload distribution
   - Verify overtime detection and hour calculations

9. **Conflict Detection**
   - Endpoint: `GET /api/v1/shifts/detect-conflicts`
   - Test system-wide conflict analysis
   - Verify aggregation-based conflict reporting

### **Phase 5: Template Automation**
10. **Create Shift Template**
    - Endpoint: `POST /api/v1/shift-templates`
    - Create recurring pattern templates
    - Test recurrence pattern validation

11. **Generate Shifts**
    - Endpoint: `POST /api/v1/shift-templates/{id}/generate-shifts`
    - Test automatic shift generation
    - Verify intelligent employee assignment

12. **Template Analytics**
    - Endpoint: `GET /api/v1/shift-templates/{id}/analytics`
    - Test template usage statistics
    - Verify assignment rate calculations

### **Phase 6: Time-Off Management**
13. **Employee Login**
    - Login as created employee to get employee token
    - Test employee role authentication

14. **Time-Off Request**
    - Endpoint: `POST /api/v1/time-off/create`
    - Create time-off requests with conflict detection
    - Test balance validation

15. **Admin Review**
    - Endpoint: `PATCH /api/v1/time-off/{id}/review`
    - Test approval/rejection workflow
    - Verify automatic balance updates

16. **Time-Off Analytics**
    - Endpoint: `GET /api/v1/time-off/analytics`
    - Test department-wise analytics
    - Verify approval rate calculations

### **Phase 7: Employee Self-Service**
17. **Employee Profile Management**
    - Endpoint: `GET /api/v1/employees/me/profile`
    - Test employee self-service capabilities
    - Update personal information and availability

18. **Personal Schedule View**
    - Endpoint: `GET /api/v1/schedules/me/schedule`
    - Test employee's personal schedule retrieval
    - Verify date range filtering

19. **Personal Time-Off Management**
    - Endpoint: `GET /api/v1/time-off/me/balance`
    - View personal time-off balance
    - Check time-off request history

### **Phase 8: Error Handling & Edge Cases**
20. **Authorization Testing**
    - Test admin endpoints with employee token (should fail)
    - Test employee endpoints with wrong employee token
    - Verify proper error responses

21. **Conflict Prevention**
    - Attempt to create overlapping shifts (should fail)
    - Try to modify published schedules (should fail)
    - Test time-off conflicts with existing shifts

---
**Thank you for the opportunity to demonstrate my technical capabilities. I look forward to discussing the implementation details and design decisions in the next round.**