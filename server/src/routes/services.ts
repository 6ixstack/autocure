import express from 'express';
import { authenticate, authorize, optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import Service from '@/models/Service';
import { AuthenticatedRequest, ApiResponse } from '@/types';

const router = express.Router();

// Get all services (public endpoint with optional auth)
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const category = req.query.category as string;
  const search = req.query.search as string;
  const popular = req.query.popular === 'true';

  let query: any = { isActive: true };

  if (category) {
    query.category = category;
  }

  if (popular) {
    query.isPopular = true;
  }

  if (search) {
    query.$text = { $search: search };
  }

  const total = await Service.countDocuments(query);
  const services = await Service.find(query)
    .sort(search ? { score: { $meta: 'textScore' } } : { isPopular: -1, name: 1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const response: ApiResponse = {
    success: true,
    message: 'Services retrieved successfully',
    data: { services },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Get service categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await Service.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Service categories retrieved successfully',
    data: { categories }
  };

  res.json(response);
}));

// Get popular services
router.get('/popular', asyncHandler(async (req, res) => {
  const services = await Service.getPopularServices().limit(10);

  const response: ApiResponse = {
    success: true,
    message: 'Popular services retrieved successfully',
    data: { services }
  };

  res.json(response);
}));

// Get services by category
router.get('/category/:category', asyncHandler(async (req, res) => {
  const { category } = req.params;
  const services = await Service.getByCategory(category);

  const response: ApiResponse = {
    success: true,
    message: `Services in ${category} category retrieved successfully`,
    data: { services, category }
  };

  res.json(response);
}));

// Get single service
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const vehicleId = req.query.vehicleId as string;

  const service = await Service.findById(id);
  if (!service) {
    throw new Error('Service not found');
  }

  let totalCost = service.basePrice;
  
  // Calculate cost based on vehicle if provided
  if (vehicleId) {
    // In a real implementation, you'd fetch the vehicle and calculate the cost
    // For now, we'll use the base calculation
    totalCost = service.calculateTotalCost();
  }

  const response: ApiResponse = {
    success: true,
    message: 'Service retrieved successfully',
    data: { 
      service: {
        ...service.toJSON(),
        totalCost
      }
    }
  };

  res.json(response);
}));

// Create service (admin only)
router.post('/', authenticate, authorize('admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const service = new Service(req.body);
  await service.save();

  const response: ApiResponse = {
    success: true,
    message: 'Service created successfully',
    data: { service }
  };

  res.status(201).json(response);
}));

// Update service (admin only)
router.put('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!service) {
    throw new Error('Service not found');
  }

  const response: ApiResponse = {
    success: true,
    message: 'Service updated successfully',
    data: { service }
  };

  res.json(response);
}));

// Delete service (admin only)
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!service) {
    throw new Error('Service not found');
  }

  const response: ApiResponse = {
    success: true,
    message: 'Service deleted successfully'
  };

  res.json(response);
}));

export default router;