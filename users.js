const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

const router = express.Router();

// @route   GET /api/users/dashboard
// @desc    Get dashboard data for logged-in user
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let dashboardData = {
      user: req.user,
      stats: {},
      recentActivity: [],
      upcomingBookings: []
    };

    if (userRole === 'customer') {
      // Customer dashboard data
      const [
        totalBookings,
        completedBookings,
        pendingBookings,
        totalSpent,
        recentBookings,
        upcomingCustomerBookings
      ] = await Promise.all([
        Booking.countDocuments({ customer: userId }),
        Booking.countDocuments({ customer: userId, status: 'completed' }),
        Booking.countDocuments({ customer: userId, status: 'pending' }),
        Payment.aggregate([
          { $match: { customer: userId, paymentStatus: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Booking.find({ customer: userId })
          .populate('service', 'name category')
          .populate('technician', 'firstName lastName rating')
          .sort({ createdAt: -1 })
          .limit(5),
        Booking.find({ 
          customer: userId, 
          status: { $in: ['pending', 'confirmed'] },
          scheduledDate: { $gte: new Date() }
        })
          .populate('service', 'name category')
          .populate('technician', 'firstName lastName rating')
          .sort({ scheduledDate: 1 })
          .limit(3)
      ]);

      dashboardData.stats = {
        totalBookings,
        completedBookings,
        pendingBookings,
        totalSpent: totalSpent.length > 0 ? totalSpent[0].total : 0
      };

      dashboardData.recentActivity = recentBookings;
      dashboardData.upcomingBookings = upcomingCustomerBookings;

    } else if (userRole === 'technician') {
      // Technician dashboard data
      const [
        totalBookings,
        completedBookings,
        pendingBookings,
        totalEarnings,
        recentBookings,
        upcomingTechBookings
      ] = await Promise.all([
        Booking.countDocuments({ technician: userId }),
        Booking.countDocuments({ technician: userId, status: 'completed' }),
        Booking.countDocuments({ technician: userId, status: { $in: ['pending', 'confirmed'] } }),
        Payment.aggregate([
          { $match: { technician: userId, paymentStatus: 'completed' } },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ]),
        Booking.find({ technician: userId })
          .populate('service', 'name category')
          .populate('customer', 'firstName lastName')
          .sort({ createdAt: -1 })
          .limit(5),
        Booking.find({ 
          technician: userId, 
          status: { $in: ['pending', 'confirmed'] },
          scheduledDate: { $gte: new Date() }
        })
          .populate('service', 'name category')
          .populate('customer', 'firstName lastName phone')
          .sort({ scheduledDate: 1 })
          .limit(3)
      ]);

      dashboardData.stats = {
        totalBookings,
        completedBookings,
        pendingBookings,
        totalEarnings: totalEarnings.length > 0 ? totalEarnings[0].total : 0,
        rating: req.user.rating,
        totalReviews: req.user.totalReviews
      };

      dashboardData.recentActivity = recentBookings;
      dashboardData.upcomingBookings = upcomingTechBookings;
    }

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
});

// @route   GET /api/users/profile/:id
// @desc    Get user profile by ID (public view)
// @access  Public
router.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email')
      .populate('reviews');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If it's a technician, get additional info
    let additionalData = {};
    if (user.role === 'technician') {
      const [
        completedBookings,
        averageRating
      ] = await Promise.all([
        Booking.countDocuments({ technician: user._id, status: 'completed' }),
        Booking.aggregate([
          { $match: { technician: user._id, status: 'completed', customerRating: { $exists: true } } },
          { $group: { _id: null, avgRating: { $avg: '$customerRating' }, count: { $sum: 1 } } }
        ])
      ]);

      additionalData = {
        completedJobs: completedBookings,
        averageRating: averageRating.length > 0 ? averageRating[0].avgRating : 0,
        totalReviews: averageRating.length > 0 ? averageRating[0].count : 0
      };
    }

    res.json({
      success: true,
      user,
      ...additionalData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// @route   GET /api/users/technicians
// @desc    Get all verified technicians
// @access  Public
router.get('/technicians', async (req, res) => {
  try {
    const { category, minRating, page = 1, limit = 10 } = req.query;
    
    const filter = { role: 'technician', isActive: true, isVerified: true };
    
    if (minRating) {
      filter.rating = { $gte: parseFloat(minRating) };
    }

    const technicians = await User.find(filter)
      .select('-password -email')
      .sort({ rating: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      technicians,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ message: 'Server error while fetching technicians' });
  }
});

// @route   PUT /api/users/verify-technician/:id
// @desc    Verify technician (admin only)
// @access  Private (Admin only)
router.put('/verify-technician/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const technician = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    ).select('-password');

    if (!technician || technician.role !== 'technician') {
      return res.status(404).json({ message: 'Technician not found' });
    }

    res.json({
      success: true,
      message: 'Technician verified successfully',
      technician
    });
  } catch (error) {
    console.error('Verify technician error:', error);
    res.status(500).json({ message: 'Server error while verifying technician' });
  }
});

// @route   GET /api/users/search
// @desc    Search users (technicians)
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, role, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const filter = {
      $or: [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { skills: { $in: [new RegExp(q, 'i')] } }
      ],
      isActive: true
    };

    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password -email')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error while searching users' });
  }
});

module.exports = router;
