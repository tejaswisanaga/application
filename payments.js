const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

const router = express.Router();

// @route   POST /api/payments
// @desc    Create a new payment
// @access  Private (Customer only)
router.post('/', auth, authorize('customer'), [
  body('booking').isMongoId().withMessage('Valid booking ID is required'),
  body('paymentMethod').isIn(['credit_card', 'debit_card', 'paypal', 'stripe', 'cash', 'bank_transfer', 'wallet']).withMessage('Invalid payment method'),
  body('amount').isNumeric({ min: 0 }).withMessage('Amount must be a positive number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { booking: bookingId, paymentMethod, amount, currency = 'USD' } = req.body;

    // Validate booking exists and belongs to the customer
    const booking = await Booking.findById(bookingId).populate('customer technician');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customer._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Payment already completed for this booking' });
    }

    // Verify amount matches booking total price
    if (amount !== booking.totalPrice) {
      return res.status(400).json({ message: 'Payment amount does not match booking total' });
    }

    // Calculate fees (example: 2.9% + $0.30 processing fee, 5% platform fee)
    const processingFee = Math.round((amount * 0.029 + 0.30) * 100) / 100;
    const platformFee = Math.round(amount * 0.05 * 100) / 100;
    const totalFees = processingFee + platformFee;
    const netAmount = amount - totalFees;

    // Create payment
    const payment = new Payment({
      booking: bookingId,
      customer: req.user.id,
      technician: booking.technician._id,
      amount,
      currency,
      paymentMethod,
      fees: {
        processingFee,
        platformFee,
        totalFees
      },
      netAmount,
      paymentStatus: 'pending'
    });

    await payment.save();

    // Update booking payment status
    booking.paymentStatus = 'pending';
    booking.paymentMethod = paymentMethod;
    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      payment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Server error while creating payment' });
  }
});

// @route   POST /api/payments/:id/confirm
// @desc    Confirm payment completion (webhook or manual confirmation)
// @access  Private (Admin or System)
router.post('/:id/confirm', auth, authorize('admin'), [
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  body('gatewayResponse').optional().isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { transactionId, gatewayResponse } = req.body;
    const payment = await Payment.findById(req.params.id).populate('booking');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment already completed' });
    }

    // Update payment
    payment.transactionId = transactionId;
    payment.gatewayResponse = gatewayResponse;
    payment.paymentStatus = 'completed';
    payment.paymentDate = new Date();
    await payment.save();

    // Update booking payment status
    if (payment.booking) {
      payment.booking.paymentStatus = 'paid';
      await payment.booking.save();
    }

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      payment
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ message: 'Server error while confirming payment' });
  }
});

// @route   POST /api/payments/:id/fail
// @desc    Mark payment as failed
// @access  Private (Admin or System)
router.post('/:id/fail', auth, authorize('admin'), [
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
], async (req, res) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.id).populate('booking');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Cannot mark completed payment as failed' });
    }

    // Update payment
    payment.paymentStatus = 'failed';
    payment.gatewayResponse = { reason };
    await payment.save();

    // Update booking payment status
    if (payment.booking) {
      payment.booking.paymentStatus = 'failed';
      await payment.booking.save();
    }

    res.json({
      success: true,
      message: 'Payment marked as failed',
      payment
    });
  } catch (error) {
    console.error('Fail payment error:', error);
    res.status(500).json({ message: 'Server error while marking payment as failed' });
  }
});

// @route   POST /api/payments/:id/refund
// @desc    Process refund
// @access  Private (Admin only)
router.post('/:id/refund', auth, authorize('admin'), [
  body('refundAmount').isNumeric({ min: 0 }).withMessage('Refund amount must be a positive number'),
  body('refundReason').trim().notEmpty().withMessage('Refund reason is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { refundAmount, refundReason } = req.body;
    const payment = await Payment.findById(req.params.id).populate('booking');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.paymentStatus !== 'completed') {
      return res.status(400).json({ message: 'Can only refund completed payments' });
    }

    if (refundAmount > payment.amount) {
      return res.status(400).json({ message: 'Refund amount cannot exceed payment amount' });
    }

    // Generate refund transaction ID
    const refundTransactionId = 'REF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();

    // Update payment
    payment.refundAmount = refundAmount;
    payment.refundDate = new Date();
    payment.refundReason = refundReason;
    payment.refundTransactionId = refundTransactionId;
    payment.paymentStatus = 'refunded';
    await payment.save();

    // Update booking payment status if full refund
    if (payment.booking && refundAmount >= payment.amount) {
      payment.booking.paymentStatus = 'refunded';
      await payment.booking.save();
    }

    res.json({
      success: true,
      message: 'Refund processed successfully',
      payment
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({ message: 'Server error while processing refund' });
  }
});

// @route   GET /api/payments
// @desc    Get payments for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      paymentMethod,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const userRole = req.user.role;
    const userId = req.user.id;

    // Build filter based on user role
    let filter = {};
    if (userRole === 'customer') {
      filter.customer = userId;
    } else if (userRole === 'technician') {
      filter.technician = userId;
    }

    if (status) {
      filter.paymentStatus = status;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const payments = await Payment.find(filter)
      .populate('booking', 'scheduledDate scheduledTime totalPrice status')
      .populate(userRole === 'customer' ? 'technician' : 'customer', 'firstName lastName email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(filter);

    res.json({
      success: true,
      payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error while fetching payments' });
  }
});

// @route   GET /api/payments/:id
// @desc    Get single payment by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking', 'scheduledDate scheduledTime totalPrice status serviceAddress')
      .populate('customer', 'firstName lastName email phone')
      .populate('technician', 'firstName lastName email phone');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user has access to this payment
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'customer' && payment.customer._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (userRole === 'technician' && payment.technician._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error while fetching payment' });
  }
});

// @route   GET /api/payments/stats
// @desc    Get payment statistics for the authenticated user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    let matchFilter = {};
    if (userRole === 'customer') {
      matchFilter.customer = userId;
    } else if (userRole === 'technician') {
      matchFilter.technician = userId;
    }

    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      totalAmount,
      totalRefunded,
      monthlyStats
    ] = await Promise.all([
      Payment.countDocuments(matchFilter),
      Payment.countDocuments({ ...matchFilter, paymentStatus: 'completed' }),
      Payment.countDocuments({ ...matchFilter, paymentStatus: 'pending' }),
      Payment.aggregate([
        { $match: { ...matchFilter, paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.aggregate([
        { $match: { ...matchFilter, paymentStatus: 'refunded' } },
        { $group: { _id: null, total: { $sum: '$refundAmount' } } }
      ]),
      Payment.aggregate([
        { $match: { ...matchFilter, paymentStatus: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$paymentDate" } },
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 12 }
      ])
    ]);

    const stats = {
      totalPayments,
      completedPayments,
      pendingPayments,
      totalAmount: totalAmount.length > 0 ? totalAmount[0].total : 0,
      totalRefunded: totalRefunded.length > 0 ? totalRefunded[0].total : 0,
      netEarnings: userRole === 'technician' 
        ? (totalAmount.length > 0 ? totalAmount[0].total : 0) - (totalRefunded.length > 0 ? totalRefunded[0].total : 0)
        : 0,
      monthlyStats
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ message: 'Server error while fetching payment statistics' });
  }
});

module.exports = router;
