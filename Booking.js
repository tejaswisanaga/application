const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Technician is required']
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service is required']
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  scheduledTime: {
    type: String,
    required: [true, 'Scheduled time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time (HH:MM)']
  },
  duration: {
    type: Number, // in hours
    required: [true, 'Duration is required'],
    min: [0.5, 'Duration must be at least 30 minutes']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'],
    default: 'pending'
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Price must be a positive number']
  },
  serviceAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'USA' }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  images: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'wallet'],
    default: 'online'
  },
  completionDate: {
    type: Date
  },
  customerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  customerReview: {
    type: String,
    trim: true,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  technicianNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Technician notes cannot exceed 1000 characters']
  },
  workImages: [{
    type: String,
    trim: true
  }],
  rescheduleCount: {
    type: Number,
    default: 0,
    min: 0
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  cancelledBy: {
    type: String,
    enum: ['customer', 'technician', 'admin', 'system']
  }
}, {
  timestamps: true
});

// Index for efficient queries
bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ technician: 1, status: 1 });
bookingSchema.index({ scheduledDate: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
