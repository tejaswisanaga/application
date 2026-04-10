const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');

const router = express.Router();

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private (Customer only)
router.post('/', auth, authorize('customer'), [
  body('service').isMongoId().withMessage('Valid service ID is required'),
  body('technician').isMongoId().withMessage('Valid technician ID is required'),
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('scheduledTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format (HH:MM) is required'),
  body('duration').isNumeric({ min: 0.5 }).withMessage('Duration must be at least 30 minutes'),
  body('serviceAddress.street').notEmpty().withMessage('Street address is required'),
  body('serviceAddress.city').notEmpty().withMessage('City is required'),
  body('serviceAddress.state').notEmpty().withMessage('State is required'),
  body('serviceAddress.zipCode').notEmpty().withMessage('Zip code is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      service: serviceId,
      technician: technicianId,
      scheduledDate,
      scheduledTime,
      duration,
      serviceAddress,
      description,
      images,
      notes,
      urgency
    } = req.body;

    // Validate service exists
    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return res.status(404).json({ message: 'Service not found or inactive' });
    }

    // Validate technician exists and is verified
    const technician = await User.findById(technicianId);
    if (!technician || technician.role !== 'technician' || !technician.isActive || !technician.isVerified) {
      return res.status(404).json({ message: 'Technician not found or not verified' });
    }

    // Check for scheduling conflicts (simplified approach)
    const conflictingBooking = await Booking.findOne({
      technician: technicianId,
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
      scheduledDate,
      scheduledTime: scheduledTime
    });

    if (conflictingBooking) {
      return res.status(409).json({ message: 'Technician is not available at this time' });
    }

    // Calculate total price
    const totalPrice = service.basePrice * duration;

    // Create booking
    const booking = new Booking({
      customer: req.user.id,
      technician: technicianId,
      service: serviceId,
      scheduledDate,
      scheduledTime,
      duration,
      totalPrice,
      serviceAddress,
      description,
      images,
      notes,
      urgency: urgency || 'medium'
    });

    await booking.save();

    // Populate booking details
    await booking.populate([
      { path: 'service', select: 'name category basePrice' },
      { path: 'technician', select: 'firstName lastName email phone rating' },
      { path: 'customer', select: 'firstName lastName email phone' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error while creating booking' });
  }
});

// @route   GET /api/bookings
// @desc    Get bookings for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
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
      filter.status = status;
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const bookings = await Booking.find(filter)
      .populate('service', 'name category basePrice')
      .populate(userRole === 'customer' ? 'technician' : 'customer', 'firstName lastName email phone rating profileImage')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Booking.countDocuments(filter);

    res.json({
      success: true,
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error while fetching bookings' });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get single booking by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('service', 'name category basePrice description')
      .populate('customer', 'firstName lastName email phone address')
      .populate('technician', 'firstName lastName email phone rating skills');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has access to this booking
    const userRole = req.user.role;
    const userId = req.user.id;

    if (userRole === 'customer' && booking.customer._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (userRole === 'technician' && booking.technician._id.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error while fetching booking' });
  }
});

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status
// @access  Private
router.put('/:id/status', auth, [
  body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, notes } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    // Check permissions and validate status transitions
    if (userRole === 'customer') {
      if (booking.customer.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      // Customers can only cancel their bookings
      if (status !== 'cancelled') {
        return res.status(403).json({ message: 'Customers can only cancel bookings' });
      }
    } else if (userRole === 'technician') {
      if (booking.technician.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      // Technicians can confirm, start work, or complete bookings
      if (!['confirmed', 'in_progress', 'completed'].includes(status)) {
        return res.status(403).json({ message: 'Invalid status for technician' });
      }
    }

    // Update booking
    booking.status = status;
    if (notes) {
      booking.technicianNotes = notes;
    }

    if (status === 'completed') {
      booking.completionDate = new Date();
    }

    if (status === 'cancelled') {
      booking.cancellationReason = notes || '';
      booking.cancelledBy = userRole;
    }

    await booking.save();

    await booking.populate([
      { path: 'service', select: 'name category' },
      { path: 'customer', select: 'firstName lastName email' },
      { path: 'technician', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: `Booking ${status} successfully`,
      booking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error while updating booking status' });
  }
});

// @route   PUT /api/bookings/:id/reschedule
// @desc    Reschedule a booking
// @access  Private
router.put('/:id/reschedule', auth, [
  body('scheduledDate').isISO8601().withMessage('Valid scheduled date is required'),
  body('scheduledTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format (HH:MM) is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { scheduledDate, scheduledTime, reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    // Check permissions
    if (userRole === 'customer' && booking.customer.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (userRole === 'technician' && booking.technician.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if booking can be rescheduled
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Booking cannot be rescheduled in current status' });
    }

    // Check for reschedule limit
    if (booking.rescheduleCount >= 3) {
      return res.status(400).json({ message: 'Maximum reschedule limit reached' });
    }

    // Check for scheduling conflicts (simplified approach)
    const conflictingBooking = await Booking.findOne({
      _id: { $ne: booking._id },
      technician: booking.technician,
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
      scheduledDate,
      scheduledTime: scheduledTime
    });

    if (conflictingBooking) {
      return res.status(409).json({ message: 'Technician is not available at this time' });
    }

    // Update booking
    booking.scheduledDate = scheduledDate;
    booking.scheduledTime = scheduledTime;
    booking.rescheduleCount += 1;
    booking.notes = reason || '';

    await booking.save();

    await booking.populate([
      { path: 'service', select: 'name category' },
      { path: 'customer', select: 'firstName lastName email' },
      { path: 'technician', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: 'Booking rescheduled successfully',
      booking
    });
  } catch (error) {
    console.error('Reschedule booking error:', error);
    res.status(500).json({ message: 'Server error while rescheduling booking' });
  }
});

// @route   POST /api/bookings/:id/review
// @desc    Add review to completed booking
// @access  Private (Customer only)
router.post('/:id/review', auth, authorize('customer'), [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional().trim().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, review } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }

    if (booking.customerRating) {
      return res.status(400).json({ message: 'Review already submitted' });
    }

    // Update booking with review
    booking.customerRating = rating;
    booking.customerReview = review;
    await booking.save();

    // Update technician's average rating
    const technician = await User.findById(booking.technician);
    const allReviews = await Booking.find({
      technician: booking.technician,
      customerRating: { $exists: true }
    });

    const totalRating = allReviews.reduce((sum, b) => sum + b.customerRating, 0);
    technician.rating = totalRating / allReviews.length;
    technician.totalReviews = allReviews.length;
    await technician.save();

    res.json({
      success: true,
      message: 'Review submitted successfully',
      booking
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Server error while adding review' });
  }
});

module.exports = router;
