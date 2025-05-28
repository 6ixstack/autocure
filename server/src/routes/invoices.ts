import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest, AppError, ApiResponse } from '@/types';

const router = express.Router();

// Simple in-memory invoice storage (in production, use a proper database model)
const invoices = new Map();
let invoiceCounter = 1000;

// Create invoice
router.post('/', authenticate, authorize('staff', 'admin'), [
  body('appointmentId').isMongoId().withMessage('Valid appointment ID is required'),
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('vehicleId').isMongoId().withMessage('Valid vehicle ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.type').isIn(['service', 'part', 'labor']).withMessage('Invalid item type'),
  body('items.*.description').notEmpty().withMessage('Item description is required'),
  body('items.*.quantity').isFloat({ min: 0.1 }).withMessage('Quantity must be positive'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be positive'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date required'),
  body('tax').optional().isFloat({ min: 0 }).withMessage('Tax must be positive'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be positive')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const {
    appointmentId,
    customerId,
    vehicleId,
    items,
    dueDate,
    tax = 0,
    discount = 0,
    notes,
    terms
  } = req.body;

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: any) => 
    sum + (item.quantity * item.unitPrice), 0
  );

  const total = subtotal + tax - discount;

  const invoice = {
    id: `INV-${++invoiceCounter}`,
    invoiceNumber: `INV-${invoiceCounter}`,
    appointmentId,
    customerId,
    vehicleId,
    issueDate: new Date(),
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: items.map((item: any) => ({
      ...item,
      totalPrice: item.quantity * item.unitPrice
    })),
    subtotal,
    tax,
    discount,
    total,
    status: 'draft',
    notes,
    terms: terms || 'Payment due within 30 days',
    createdBy: req.user?._id,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  invoices.set(invoice.id, invoice);

  const response: ApiResponse = {
    success: true,
    message: 'Invoice created successfully',
    data: { invoice }
  };

  res.status(201).json(response);
}));

// Get invoices
router.get('/', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const customerId = req.query.customerId as string;

  let filteredInvoices = Array.from(invoices.values());

  // Filter by customer for customer role
  if (req.user?.role === 'customer') {
    filteredInvoices = filteredInvoices.filter(inv => inv.customerId === req.user?._id.toString());
  } else if (customerId) {
    filteredInvoices = filteredInvoices.filter(inv => inv.customerId === customerId);
  }

  // Filter by status
  if (status) {
    filteredInvoices = filteredInvoices.filter(inv => inv.status === status);
  }

  // Sort by creation date (newest first)
  filteredInvoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Pagination
  const total = filteredInvoices.length;
  const startIndex = (page - 1) * limit;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + limit);

  const response: ApiResponse = {
    success: true,
    message: 'Invoices retrieved successfully',
    data: { invoices: paginatedInvoices },
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  res.json(response);
}));

// Get single invoice
router.get('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const invoice = invoices.get(id);

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // Check access permissions
  if (req.user?.role === 'customer' && invoice.customerId !== req.user._id.toString()) {
    throw new AppError('Access denied to this invoice', 403);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Invoice retrieved successfully',
    data: { invoice }
  };

  res.json(response);
}));

// Update invoice status
router.patch('/:id/status', authenticate, authorize('staff', 'admin'), [
  body('status').isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled']).withMessage('Invalid status'),
  body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
  body('paymentDate').optional().isISO8601().withMessage('Valid payment date required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { id } = req.params;
  const { status, paymentMethod, paymentDate } = req.body;

  const invoice = invoices.get(id);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  invoice.status = status;
  invoice.updatedAt = new Date();

  if (status === 'paid') {
    invoice.paymentMethod = paymentMethod;
    invoice.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
  }

  const response: ApiResponse = {
    success: true,
    message: 'Invoice status updated successfully',
    data: { invoice }
  };

  res.json(response);
}));

// Send invoice
router.post('/:id/send', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = invoices.get(id);

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // In a real implementation, you would:
  // 1. Generate PDF invoice
  // 2. Send email to customer
  // 3. Update status to 'sent'
  // 4. Log the activity

  invoice.status = 'sent';
  invoice.sentDate = new Date();
  invoice.updatedAt = new Date();

  // Simulate email sending
  console.log(`📧 Invoice ${invoice.invoiceNumber} sent to customer ${invoice.customerId}`);

  const response: ApiResponse = {
    success: true,
    message: 'Invoice sent successfully',
    data: { invoice }
  };

  res.json(response);
}));

// Generate invoice summary
router.get('/summary/stats', authenticate, authorize('staff', 'admin'), asyncHandler(async (req, res) => {
  const allInvoices = Array.from(invoices.values());
  
  const summary = {
    total: allInvoices.length,
    draft: allInvoices.filter(inv => inv.status === 'draft').length,
    sent: allInvoices.filter(inv => inv.status === 'sent').length,
    paid: allInvoices.filter(inv => inv.status === 'paid').length,
    overdue: allInvoices.filter(inv => inv.status === 'overdue').length,
    cancelled: allInvoices.filter(inv => inv.status === 'cancelled').length,
    totalRevenue: allInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0),
    pendingRevenue: allInvoices
      .filter(inv => inv.status === 'sent')
      .reduce((sum, inv) => sum + inv.total, 0)
  };

  const response: ApiResponse = {
    success: true,
    message: 'Invoice summary retrieved successfully',
    data: { summary }
  };

  res.json(response);
}));

// Delete invoice
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = invoices.get(id);

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // Only allow deletion of draft invoices
  if (invoice.status !== 'draft') {
    throw new AppError('Can only delete draft invoices', 400);
  }

  invoices.delete(id);

  const response: ApiResponse = {
    success: true,
    message: 'Invoice deleted successfully'
  };

  res.json(response);
}));

export default router;