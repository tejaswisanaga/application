const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
require('dotenv').config();

// Sample data
const sampleUsers = [
  {
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
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    password: 'password123',
    phone: '0987654321',
    role: 'technician',
    address: {
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001'
    },
    skills: ['Plumbing', 'Electrical', 'HVAC'],
    experience: 5,
    certification: 'Licensed Technician',
    hourlyRate: 75,
    isVerified: true,
    rating: 4.5,
    totalReviews: 12
  },
  {
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike@example.com',
    password: 'password123',
    phone: '5551234567',
    role: 'technician',
    address: {
      street: '789 Pine Rd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601'
    },
    skills: ['Carpentry', 'Painting'],
    experience: 8,
    certification: 'Master Carpenter',
    hourlyRate: 65,
    isVerified: true,
    rating: 4.8,
    totalReviews: 25
  }
];

const sampleServices = [
  {
    name: 'Plumbing Repair',
    description: 'Professional plumbing repair services for residential and commercial properties',
    category: 'plumbing',
    basePrice: 150,
    estimatedDuration: 2,
    difficulty: 'medium',
    requiredSkills: ['Plumbing'],
    toolsRequired: ['Pipe wrench', 'Plumber tape', 'Snake tool'],
    tags: ['repair', 'emergency', 'residential'],
    isActive: true
  },
  {
    name: 'Electrical Installation',
    description: 'Complete electrical installation and wiring services',
    category: 'electrical',
    basePrice: 200,
    estimatedDuration: 3,
    difficulty: 'hard',
    requiredSkills: ['Electrical'],
    toolsRequired: ['Wire strippers', 'Multimeter', 'Electrical tape'],
    tags: ['installation', 'wiring', 'safety'],
    isActive: true
  },
  {
    name: 'House Painting',
    description: 'Interior and exterior painting services for homes and offices',
    category: 'painting',
    basePrice: 120,
    estimatedDuration: 4,
    difficulty: 'easy',
    requiredSkills: ['Painting'],
    toolsRequired: ['Paint brushes', 'Rollers', 'Drop cloths'],
    tags: ['interior', 'exterior', 'decorating'],
    isActive: true
  },
  {
    name: 'HVAC Maintenance',
    description: 'Regular HVAC system maintenance and repair',
    category: 'hvac',
    basePrice: 180,
    estimatedDuration: 2.5,
    difficulty: 'medium',
    requiredSkills: ['HVAC'],
    toolsRequired: ['HVAC tools', 'Refrigerant', 'Gauges'],
    tags: ['maintenance', 'heating', 'cooling'],
    isActive: true
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Service.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});
    console.log('Cleared existing data');

    // Insert sample users
    const users = await User.insertMany(sampleUsers);
    console.log(`Created ${users.length} users`);

    // Insert sample services
    const services = await Service.insertMany(sampleServices);
    console.log(`Created ${services.length} services`);

    // Create sample bookings
    const sampleBookings = [
      {
        customer: users[0]._id, // John Doe (customer)
        technician: users[1]._id, // Jane Smith (technician)
        service: services[0]._id, // Plumbing Repair
        scheduledDate: new Date('2024-01-15'),
        scheduledTime: '10:00',
        duration: 2,
        totalPrice: 150,
        serviceAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        description: 'Kitchen sink repair needed',
        urgency: 'medium',
        status: 'confirmed'
      },
      {
        customer: users[0]._id, // John Doe (customer)
        technician: users[2]._id, // Mike Johnson (technician)
        service: services[2]._id, // House Painting
        scheduledDate: new Date('2024-01-20'),
        scheduledTime: '14:00',
        duration: 4,
        totalPrice: 120,
        serviceAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        description: 'Living room painting',
        urgency: 'low',
        status: 'pending'
      }
    ];

    const bookings = await Booking.insertMany(sampleBookings);
    console.log(`Created ${bookings.length} bookings`);

    // Create sample payments
    const samplePayments = [
      {
        booking: bookings[0]._id,
        customer: users[0]._id,
        technician: users[1]._id,
        amount: 150,
        currency: 'USD',
        paymentMethod: 'credit_card',
        paymentStatus: 'completed',
        paymentDate: new Date(),
        fees: {
          processingFee: 4.65,
          platformFee: 7.5,
          totalFees: 12.15
        },
        netAmount: 137.85,
        transactionId: 'TXN_1640995200000_ABC123'
      }
    ];

    const payments = await Payment.insertMany(samplePayments);
    console.log(`Created ${payments.length} payments`);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
