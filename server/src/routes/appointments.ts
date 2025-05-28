import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import Appointment from '@/models/Appointment';
import Vehicle from '@/models/Vehicle';
import Service from '@/models/Service';
import { AuthenticatedRequest, AppError, ApiResponse } from '@/types';

const router = express.Router();

// Validation rules
const appointmentValidation = [
  body('vehicleId').isMongoId().withMessage('Valid vehicle ID is required'),
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('services.*').isMongoId().withMessage('Invalid service ID'),
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)'),
  body('customerConcerns').optional().isLength({ max: 1000 }).withMessage('Concerns cannot exceed 1000 characters'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority level')
];

// Create appointment
router.post('/', authenticate, appointmentValidation, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { vehicleId, services, appointmentDate, appointmentTime, customerConcerns, priority = 'normal' } = req.body;

  // Verify vehicle ownership for customers
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  if (req.user?.role === 'customer' && vehicle.owner.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied to this vehicle', 403);
  }

  // Verify services exist
  const serviceList = await Service.find({ _id: { $in: services }, isActive: true });
  if (serviceList.length !== services.length) {
    throw new AppError('One or more services not found', 404);
  }

  // Calculate estimated duration and cost
  const estimatedDuration = serviceList.reduce((total, service) => total + service.estimatedDuration, 0);
  const estimatedCost = serviceList.reduce((total, service) => total + service.calculateTotalCost(vehicle), 0);

  // Check for scheduling conflicts (simplified - in production, use more sophisticated logic)
  const appointmentDateTime = new Date(appointmentDate);
  const [hours, minutes] = appointmentTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));

  const conflictingAppointments = await Appointment.find({
    appointmentDate: appointmentDate,
    status: { $in: ['scheduled', 'confirmed', 'in-progress'] }
  });

  // For demo purposes, assume we have 5 bays and can handle multiple appointments
  if (conflictingAppointments.length >= 5) {
    throw new AppError('No available time slots for the selected date and time', 409);
  }

  const appointment = new Appointment({
    customer: req.user?._id,
    vehicle: vehicleId,
    services,
    appointmentDate,
    appointmentTime,
    estimatedDuration,
    estimatedCost,
    customerConcerns,
    priority,
    status: 'scheduled',
    timeline: [{
      timestamp: new Date(),
      status: 'scheduled',
      description: 'Appointment scheduled',
      notificationSent: false
    }]
  });

  await appointment.save();
  await appointment.populate(['customer', 'vehicle', 'services']);

  // Emit real-time notification
  if ((req as any).io) {
    (req as any).io.emit('appointment_created', {
      appointment: appointment.toJSON(),
      customerId: req.user?._id
    });
  }

  const response: ApiResponse = {
    success: true,
    message: 'Appointment created successfully',
    data: { appointment }
  };

  res.status(201).json(response);
}));

// Get appointments
router.get('/', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const customerId = req.query.customerId as string;

  let query: any = {};

  // Customers can only see their own appointments
  if (req.user?.role === 'customer') {
    query.customer = req.user._id;
  } else if (customerId) {
    query.customer = customerId;
  }

  if (status) {
    query.status = status;
  }

  const total = await Appointment.countDocuments(query);
  const appointments = await Appointment.find(query)
    .populate('customer', 'firstName lastName email phone')
    .populate('vehicle', 'year make model vin licensePlate')
    .populate('services', 'name category basePrice estimatedDuration')
    .populate('assignedTechnician', 'firstName lastName')
    .sort({ appointmentDate: -1, appointmentTime: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const response: ApiResponse = {
    success: true,
    message: 'Appointments retrieved successfully',
    data: { appointments },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Get single appointment
router.get('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const appointment = await Appointment.findById(id)
    .populate('customer', 'firstName lastName email phone')
    .populate('vehicle', 'year make model vin licensePlate mileage')
    .populate('services', 'name category basePrice estimatedDuration')
    .populate('assignedTechnician', 'firstName lastName');

  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Check access permissions
  if (req.user?.role === 'customer' && appointment.customer._id.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied to this appointment', 403);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Appointment retrieved successfully',
    data: { appointment }
  };

  res.json(response);
}));

// Update appointment status
router.patch('/:id/status', authenticate, authorize('staff', 'admin'), [
  body('status').isIn(['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']).withMessage('Invalid status'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { id } = req.params;
  const { status, notes } = req.body;

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Add timeline entry
  await appointment.addTimelineEntry(status, notes || `Status updated to ${status}`);

  await appointment.populate(['customer', 'vehicle', 'services']);

  // Emit real-time notification
  if ((req as any).io) {
    (req as any).io.to(`user_${appointment.customer._id}`).emit('appointment_updated', {
      appointmentId: appointment._id,
      status,
      notes
    });
  }

  const response: ApiResponse = {
    success: true,
    message: 'Appointment status updated successfully',
    data: { appointment }
  };

  res.json(response);
}));

// Reschedule appointment
router.patch('/:id/reschedule', authenticate, [
  body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
  body('appointmentTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time format required (HH:MM)')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { id } = req.params;
  const { appointmentDate, appointmentTime } = req.body;

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Check permissions
  if (req.user?.role === 'customer' && appointment.customer.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied to this appointment', 403);
  }

  // Check if appointment can be rescheduled
  if (appointment.status === 'completed' || appointment.status === 'cancelled') {
    throw new AppError('Cannot reschedule completed or cancelled appointments', 400);
  }

  appointment.appointmentDate = new Date(appointmentDate);
  appointment.appointmentTime = appointmentTime;
  
  await appointment.addTimelineEntry('scheduled', 'Appointment rescheduled');
  await appointment.populate(['customer', 'vehicle', 'services']);

  const response: ApiResponse = {
    success: true,
    message: 'Appointment rescheduled successfully',
    data: { appointment }
  };

  res.json(response);
}));

// Cancel appointment
router.delete('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  const appointment = await Appointment.findById(id);
  if (!appointment) {
    throw new AppError('Appointment not found', 404);
  }

  // Check permissions
  if (req.user?.role === 'customer' && appointment.customer.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied to this appointment', 403);
  }

  // Check if appointment can be cancelled
  if (appointment.status === 'completed') {
    throw new AppError('Cannot cancel completed appointments', 400);
  }

  await appointment.addTimelineEntry('cancelled', 'Appointment cancelled');

  const response: ApiResponse = {
    success: true,
    message: 'Appointment cancelled successfully',
    data: { appointment }
  };

  res.json(response);
}));

export default router;