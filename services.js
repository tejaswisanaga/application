const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const Service = require('../models/Service');

const router = express.Router();

// @route   GET /api/services
// @desc    Get all services with filtering and pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      difficulty,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.basePrice = {};
      if (minPrice) filter.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice) filter.basePrice.$lte = parseFloat(maxPrice);
    }

    if (difficulty) {
      filter.difficulty = difficulty;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const services = await Service.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Service.countDocuments(filter);

    res.json({
      success: true,
      services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        categories: await Service.distinct('category'),
        difficulties: ['easy', 'medium', 'hard']
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error while fetching services' });
  }
});

// @route   GET /api/services/:id
// @desc    Get single service by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service || !service.isActive) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({
      success: true,
      service
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Server error while fetching service' });
  }
});

// @route   POST /api/services
// @desc    Create a new service
// @access  Private (Admin only)
router.post('/', auth, authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Service name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['laptop_computer', 'network_wifi', 'cctv_security', 'software_solutions', 'business_it', 'smart_home', 'appliances']).withMessage('Invalid category'),
  body('basePrice').isNumeric().withMessage('Base price must be a number'),
  body('estimatedDuration').isNumeric().withMessage('Estimated duration must be a number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const service = new Service(req.body);
    await service.save();

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      service
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error while creating service' });
  }
});

// @route   PUT /api/services/:id
// @desc    Update a service
// @access  Private (Admin only)
router.put('/:id', auth, authorize('admin'), [
  body('name').optional().trim().notEmpty().withMessage('Service name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('basePrice').optional().isNumeric().withMessage('Base price must be a number'),
  body('estimatedDuration').optional().isNumeric().withMessage('Estimated duration must be a number'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({
      success: true,
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error while updating service' });
  }
});

// @route   DELETE /api/services/:id
// @desc    Delete a service (soft delete)
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error while deleting service' });
  }
});

// @route   GET /api/services/categories
// @desc    Get all service categories
// @access  Public
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await Service.distinct('category');
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

// @route   GET /api/services/featured
// @desc    Get featured services
// @access  Public
router.get('/featured/list', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const services = await Service.find({ isActive: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      services
    });
  } catch (error) {
    console.error('Get featured services error:', error);
    res.status(500).json({ message: 'Server error while fetching featured services' });
  }
});

// @route   GET /api/services/search
// @desc    Search services
// @access  Public
router.get('/search/query', async (req, res) => {
  try {
    const { q, category, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const filter = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ],
      isActive: true
    };

    if (category) {
      filter.category = category;
    }

    const services = await Service.find(filter)
      .sort({ rating: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Service.countDocuments(filter);

    res.json({
      success: true,
      services,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search services error:', error);
    res.status(500).json({ message: 'Server error while searching services' });
  }
});

module.exports = router;
