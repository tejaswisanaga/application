const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking is required']
  },
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
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be a positive number']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'stripe', 'cash', 'bank_transfer', 'wallet'],
    required: [true, 'Payment method is required']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  refundAmount: {
    type: Number,
    min: 0
  },
  refundDate: {
    type: Date
  },
  refundReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Refund reason cannot exceed 500 characters']
  },
  refundTransactionId: {
    type: String,
    sparse: true
  },
  fees: {
    processingFee: {
      type: Number,
      default: 0
    },
    platformFee: {
      type: Number,
      default: 0
    },
    totalFees: {
      type: Number,
      default: 0
    }
  },
  netAmount: {
    type: Number,
    min: 0
  },
  paymentIntentId: {
    type: String,
    sparse: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Calculate net amount before saving
paymentSchema.pre('save', function(next) {
  if (this.amount && this.fees) {
    this.netAmount = this.amount - (this.fees.processingFee + this.fees.platformFee);
  }
  next();
});

// Generate transaction ID before saving
paymentSchema.pre('save', function(next) {
  if (!this.transactionId && this.paymentStatus !== 'pending') {
    this.transactionId = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
