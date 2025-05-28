import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import Vehicle from '@/models/Vehicle';
import { AuthenticatedRequest, AppError, ApiResponse } from '@/types';

const router = express.Router();

// Validation rules
const vehicleValidation = [
  body('vin').matches(/^[A-HJ-NPR-Z0-9]{17}$/).withMessage('Invalid VIN format'),
  body('make').trim().isLength({ min: 1, max: 50 }).withMessage('Make is required and must be 1-50 characters'),
  body('model').trim().isLength({ min: 1, max: 50 }).withMessage('Model is required and must be 1-50 characters'),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 2 }).withMessage('Invalid year'),
  body('transmission').optional().isIn(['manual', 'automatic', 'cvt', 'other']).withMessage('Invalid transmission type'),
  body('fuelType').optional().isIn(['gasoline', 'diesel', 'hybrid', 'electric', 'other']).withMessage('Invalid fuel type'),
  body('mileage').optional().isInt({ min: 0 }).withMessage('Mileage must be a positive number')
];

// Create vehicle
router.post('/', authenticate, vehicleValidation, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const vehicleData = {
    ...req.body,
    owner: req.user?._id,
    vin: req.body.vin.toUpperCase()
  };

  // Check if VIN already exists
  const existingVehicle = await Vehicle.findOne({ vin: vehicleData.vin });
  if (existingVehicle) {
    throw new AppError('Vehicle with this VIN already exists', 400);
  }

  const vehicle = new Vehicle(vehicleData);
  await vehicle.save();
  await vehicle.populate('owner', 'firstName lastName email phone');

  const response: ApiResponse = {
    success: true,
    message: 'Vehicle created successfully',
    data: { vehicle }
  };

  res.status(201).json(response);
}));

// Get vehicles
router.get('/', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;
  const ownerId = req.query.ownerId as string;

  let query: any = { isActive: true };

  // Customers can only see their own vehicles
  if (req.user?.role === 'customer') {
    query.owner = req.user._id;
  } else if (ownerId) {
    query.owner = ownerId;
  }

  if (search) {
    query.$or = [
      { make: { $regex: search, $options: 'i' } },
      { model: { $regex: search, $options: 'i' } },
      { vin: { $regex: search, $options: 'i' } },
      { licensePlate: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await Vehicle.countDocuments(query);
  const vehicles = await Vehicle.find(query)
    .populate('owner', 'firstName lastName email phone')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const response: ApiResponse = {
    success: true,
    message: 'Vehicles retrieved successfully',
    data: { vehicles },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Get single vehicle
router.get('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const vehicle = await Vehicle.findById(id).populate('owner', 'firstName lastName email phone');
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  // Check access permissions
  if (req.user?.role === 'customer' && vehicle.owner._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied to this vehicle', 403);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Vehicle retrieved successfully',
    data: { vehicle }
  };

  res.json(response);
}));

// Update vehicle
router.put('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const vehicle = await Vehicle.findById(id);
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  // Check permissions
  if (req.user?.role === 'customer' && vehicle.owner.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied to this vehicle', 403);
  }

  const allowedUpdates = [
    'mileage', 'color', 'licensePlate', 'notes', 'tags'
  ];

  // Staff can update more fields
  if (req.user?.role === 'staff' || req.user?.role === 'admin') {
    allowedUpdates.push('trim', 'engine', 'transmission', 'fuelType', 'lastServiceDate', 'nextServiceDue');
  }

  const updates: any = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const updatedVehicle = await Vehicle.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  ).populate('owner', 'firstName lastName email phone');

  const response: ApiResponse = {
    success: true,
    message: 'Vehicle updated successfully',
    data: { vehicle: updatedVehicle }
  };

  res.json(response);
}));

// Add service history
router.post('/:id/service-history', authenticate, authorize('staff', 'admin'), [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('mileage').isInt({ min: 0 }).withMessage('Valid mileage is required'),
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
  body('technician').optional().isLength({ max: 100 }).withMessage('Technician name too long'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { id } = req.params;
  const serviceEntry = req.body;

  const vehicle = await Vehicle.findById(id);
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  vehicle.serviceHistory.push(serviceEntry);
  vehicle.lastServiceDate = new Date(serviceEntry.date);
  
  // Calculate next service due date
  const nextService = vehicle.getNextServiceRecommendation();
  vehicle.nextServiceDue = nextService.nextDate;

  await vehicle.save();

  const response: ApiResponse = {
    success: true,
    message: 'Service history added successfully',
    data: { vehicle }
  };

  res.json(response);
}));

// Add diagnostic history
router.post('/:id/diagnostic-history', authenticate, authorize('staff', 'admin'), [
  body('date').isISO8601().withMessage('Valid date is required'),
  body('codes').isArray({ min: 1 }).withMessage('At least one diagnostic code is required'),
  body('codes.*.code').matches(/^[PBU][0-9A-F]{4}$/i).withMessage('Invalid diagnostic code format'),
  body('codes.*.description').notEmpty().withMessage('Code description is required'),
  body('codes.*.severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity level'),
  body('mileage').optional().isInt({ min: 0 }).withMessage('Invalid mileage'),
  body('equipment').optional().isLength({ max: 100 }).withMessage('Equipment name too long'),
  body('technician').optional().isLength({ max: 100 }).withMessage('Technician name too long'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { id } = req.params;
  const diagnosticEntry = req.body;

  const vehicle = await Vehicle.findById(id);
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  vehicle.diagnosticHistory.push(diagnosticEntry);
  await vehicle.save();

  const response: ApiResponse = {
    success: true,
    message: 'Diagnostic history added successfully',
    data: { vehicle }
  };

  res.json(response);
}));

// Get vehicles due for service
router.get('/due/service', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const dueVehicles = await Vehicle.findDueForService()
    .populate('owner', 'firstName lastName email phone')
    .sort({ nextServiceDue: 1 });

  const response: ApiResponse = {
    success: true,
    message: 'Vehicles due for service retrieved',
    data: { vehicles: dueVehicles }
  };

  res.json(response);
}));

export default router;