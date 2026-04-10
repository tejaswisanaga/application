const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\d{10,15}$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['customer', 'technician'],
    required: [true, 'Role is required']
  },
  profileImage: {
    type: String,
    default: ''
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  // Technician specific fields
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    min: 0,
    max: 50
  },
  certification: {
    type: String,
    trim: true
  },
  hourlyRate: {
    type: Number,
    min: 0
  },
  availability: {
    monday: { available: Boolean, hours: { start: String, end: String } },
    tuesday: { available: Boolean, hours: { start: String, end: String } },
    wednesday: { available: Boolean, hours: { start: String, end: String } },
    thursday: { available: Boolean, hours: { start: String, end: String } },
    friday: { available: Boolean, hours: { start: String, end: String } },
    saturday: { available: Boolean, hours: { start: String, end: String } },
    sunday: { available: Boolean, hours: { start: String, end: String } }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get full name virtual
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hide password in JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
