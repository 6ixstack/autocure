import express from 'express';
import { authenticate, authorize } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import User from '@/models/User';
import { AuthenticatedRequest, AppError, ApiResponse } from '@/types';

const router = express.Router();

// Get all customers (staff/admin only)
router.get('/', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;

  const query: any = { role: 'customer', isActive: true };
  
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const total = await User.countDocuments(query);
  const customers = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const response: ApiResponse = {
    success: true,
    message: 'Customers retrieved successfully',
    data: { customers },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Get single customer
router.get('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  
  // Customers can only view their own profile
  if (req.user?.role === 'customer' && req.user._id.toString() !== id) {
    throw new AppError('Access denied', 403);
  }

  const customer = await User.findById(id).select('-password');
  if (!customer || customer.role !== 'customer') {
    throw new AppError('Customer not found', 404);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Customer retrieved successfully',
    data: { customer }
  };

  res.json(response);
}));

export default router;