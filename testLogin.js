const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find john@example.com user
    const user = await User.findOne({ email: 'john@example.com' }).select('+password');
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:', user.email);
    console.log('Stored password hash:', user.password);
    
    // Test password comparison
    const isMatch = await user.comparePassword('password123');
    console.log('Password "password123" matches:', isMatch);
    
    if (isMatch) {
      console.log('Login should work with:');
      console.log('Email: john@example.com');
      console.log('Password: password123');
      console.log('Role: customer');
    } else {
      console.log('Password does not match. Creating new user...');
      
      // Delete and recreate john@example.com
      await User.deleteOne({ email: 'john@example.com' });
      
      const newUser = new User({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '1234567890',
        role: 'customer',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        isVerified: true
      });

      await newUser.save();
      console.log('New John Doe user created successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();
