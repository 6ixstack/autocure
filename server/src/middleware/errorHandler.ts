import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/types';

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  stack?: string;
  statusCode: number;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.name === 'MongoServerError' && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue || {})[0];
    const message = field ? `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` : 'Duplicate key error';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors).map((val: any) => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // Multer errors
  if (err.name === 'MulterError') {
    let message = 'File upload error';
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else if ((err as any).code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Invalid file field';
    }
    error = new AppError(message, 400);
  }

  const statusCode = (error as AppError).statusCode || 500;
  const message = error.message || 'Internal Server Error';

  const errorResponse: ErrorResponse = {
    success: false,
    message,
    statusCode
  };

  // Include additional error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error = err.name;
    errorResponse.stack = err.stack;
  }

  // Don't leak sensitive information in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.message = 'Something went wrong!';
  }

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = <T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) => {
  return (req: T, res: U, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};