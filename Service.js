const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['laptop_computer', 'network_wifi', 'cctv_security', 'software_solutions', 'business_it', 'smart_home', 'appliances']
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price must be a positive number']
  },
  estimatedDuration: {
    type: Number, // in hours
    required: [true, 'Estimated duration is required'],
    min: [0.5, 'Duration must be at least 30 minutes']
  },
  images: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  requiredSkills: [{
    type: String,
    trim: true
  }],
  toolsRequired: [{
    type: String,
    trim: true
  }],
  serviceArea: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Service', serviceSchema);
