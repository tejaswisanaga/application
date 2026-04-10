const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Delete existing test user if exists
    await User.deleteOne({ email: 'test@example.com' });
    console.log('Deleted existing test user');

    // Create new test user
    const testUser = new User({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: '123456',
      phone: '1234567890',
      role: 'customer',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      },
      isVerified: true
    });

    await testUser.save();
    console.log('Test user created successfully!');
    console.log('Email: test@example.com');
    console.log('Password: 123456');
    console.log('Role: customer');

    // Also check if john@example.com exists
    const johnUser = await User.findOne({ email: 'john@example.com' });
    if (johnUser) {
      console.log('\nJohn Doe user found in database:');
      console.log('Email:', johnUser.email);
      console.log('Password is hashed:', johnUser.password);
      console.log('Try logging with password: password123');
    } else {
      console.log('\nJohn Doe user not found in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();
