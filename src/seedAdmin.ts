// src/seedAdmin.ts
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

async function seedAdmin() {
  try {
    // Connect to MongoDB with a NEW database name
    await mongoose.connect('mongodb+srv://nizum:5kXPMsQBqhf65LZr@cluster0.4fphg1c.mongodb.net/schedule?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB (scheduler-app database)');

    // Create User schema
    const userSchema = new mongoose.Schema({
      id: String,
      email: String,
      password: String,
      role: String,
      status: String,
      needsPasswordChange: Boolean,
      isDeleted: Boolean,
    }, { timestamps: true });

    const User = mongoose.model('User', userSchema);

    // Check existing users first
    const users = await User.find({});
    console.log('Existing users:', users.map(u => ({ id: u.id, role: u.role, email: u.email })));

    // Check if admin exists
    const existingAdmin = await User.findOne({ role: 'superAdmin' });
    if (existingAdmin) {
      console.log('Super Admin already exists:', existingAdmin.id);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const newAdmin = await User.create({
      id: 'SA-0001',
      email: 'superadmin@company.com',
      password: hashedPassword,
      role: 'superAdmin',
      status: 'in-progress',
      needsPasswordChange: false,
      isDeleted: false,
    });

    console.log('✅ Super Admin created successfully!');
    console.log('ID:', newAdmin.id);
    console.log('Email:', newAdmin.email);
    console.log('Password: admin123');
    console.log('\n🚀 You can now login with:');
    console.log('POST /api/v1/auth/login');
    console.log('Body: { "id": "SA-0001", "password": "admin123" }');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Database connection closed');
    process.exit(0);
  }
}

seedAdmin();