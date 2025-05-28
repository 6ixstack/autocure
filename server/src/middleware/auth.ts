import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { AuthenticatedRequest, IUser, AppError } from '@/types';

interface JwtPayload {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AppError('Access token is required', 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError('JWT secret is not configured', 500);
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    
    const user = await User.findById(decoded.id).select('+password');
    if (!user || !user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      if (jwtSecret) {
        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};

export const requireEmailVerification = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (!req.user.emailVerified) {
    return next(new AppError('Email verification required', 403));
  }

  next();
};

export const requireOwnResource = (resourceField: string = 'id') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    const resourceId = req.params[resourceField];
    const userId = req.user._id.toString();

    // Admins can access any resource
    if (req.user.role === 'admin') {
      return next();
    }

    // Staff can access customer resources
    if (req.user.role === 'staff') {
      return next();
    }

    // Customers can only access their own resources
    if (req.user.role === 'customer' && resourceId !== userId) {
      return next(new AppError('Access denied to this resource', 403));
    }

    next();
  };
};

export const generateToken = (user: IUser): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError('JWT secret is not configured', 500);
  }

  const payload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email
  };

  return jwt.sign(payload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export const verifyToken = (token: string): JwtPayload => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError('JWT secret is not configured', 500);
  }

  return jwt.verify(token, jwtSecret) as JwtPayload;
};

const extractToken = (req: Request): string | null => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const token = req.cookies?.token;
  if (token) {
    return token;
  }

  // Check query parameter (for WebSocket connections)
  const queryToken = req.query?.token;
  if (typeof queryToken === 'string') {
    return queryToken;
  }

  return null;
};

// Rate limiting for auth endpoints
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: {
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
};