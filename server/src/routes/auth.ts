import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import User from '@/models/User';
import { generateToken, authenticate } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest, AppError, ApiResponse } from '@/types';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later' }
});

// Validation rules
const registerValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('phone').matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Please enter a valid phone number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['customer', 'staff', 'admin']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Register
router.post('/register', authLimiter, registerValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { firstName, lastName, email, phone, password, role = 'customer' } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists with this email', 400);
  }

  // Create user
  const user = new User({
    firstName,
    lastName,
    email,
    phone,
    password,
    role: role === 'admin' || role === 'staff' ? 'customer' : role, // Prevent privilege escalation
    emailVerified: false,
    phoneVerified: false
  });

  await user.save();

  // Generate token
  const token = generateToken(user);

  const response: ApiResponse = {
    success: true,
    message: 'Registration successful',
    data: {
      user: user.toJSON(),
      token
    }
  };

  res.status(201).json(response);
}));

// Login
router.post('/login', authLimiter, loginValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { email, password } = req.body;

  // Find user and include password for comparison
  const user = await User.findOne({ email, isActive: true }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate token
  const token = generateToken(user);

  const response: ApiResponse = {
    success: true,
    message: 'Login successful',
    data: {
      user: user.toJSON(),
      token
    }
  };

  res.json(response);
}));

// Get current user
router.get('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'User profile retrieved',
    data: { user: req.user?.toJSON() }
  };

  res.json(response);
}));

// Update profile
router.put('/profile', authenticate, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/),
  body('address.street').optional().trim().isLength({ max: 100 }),
  body('address.city').optional().trim().isLength({ max: 50 }),
  body('address.province').optional().trim().isLength({ max: 50 }),
  body('address.postalCode').optional().matches(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/),
  body('preferences.notifications.email').optional().isBoolean(),
  body('preferences.notifications.sms').optional().isBoolean(),
  body('preferences.notifications.push').optional().isBoolean(),
  body('preferences.communicationMethod').optional().isIn(['email', 'sms', 'both'])
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  if (!req.user) {
    throw new AppError('User not found', 404);
  }

  const allowedUpdates = [
    'firstName', 'lastName', 'phone', 'address', 'preferences'
  ];

  const updates: any = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  const response: ApiResponse = {
    success: true,
    message: 'Profile updated successfully',
    data: { user: user?.toJSON() }
  };

  res.json(response);
}));

// Change password
router.put('/password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  })
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  if (!req.user) {
    throw new AppError('User not found', 404);
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  const response: ApiResponse = {
    success: true,
    message: 'Password changed successfully'
  };

  res.json(response);
}));

// Refresh token
router.post('/refresh', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    throw new AppError('User not found', 404);
  }

  const token = generateToken(req.user);

  const response: ApiResponse = {
    success: true,
    message: 'Token refreshed successfully',
    data: { token }
  };

  res.json(response);
}));

// Logout (client-side token removal, server-side placeholder)
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const response: ApiResponse = {
    success: true,
    message: 'Logged out successfully'
  };

  res.json(response);
}));

export default router;