import { Document, Types } from 'mongoose';
import { Request } from 'express';
import { Server } from 'socket.io';

// User types
export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: 'customer' | 'staff' | 'admin';
  avatar?: string;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    communicationMethod: 'email' | 'sms' | 'both';
  };
  isActive: boolean;
  lastLogin?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  fullName: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

// Vehicle types
export interface IVehicle extends Document {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  vin: string;
  make: string;
  vehicleModel: string;
  year: number;
  trim?: string;
  engine?: string;
  transmission: 'manual' | 'automatic' | 'cvt' | 'other';
  fuelType: 'gasoline' | 'diesel' | 'hybrid' | 'electric' | 'other';
  color?: string;
  licensePlate?: string;
  mileage?: number;
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  serviceHistory: Array<{
    date: Date;
    mileage: number;
    services: string[];
    notes?: string;
    cost?: number;
    technician?: string;
  }>;
  diagnosticHistory: Array<{
    date: Date;
    codes: Array<{
      code: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
    mileage?: number;
    equipment?: string;
    technician?: string;
    resolved: boolean;
    notes?: string;
  }>;
  photos: string[];
  documents: string[];
  isActive: boolean;
  tags: string[];
  notes?: string;
  displayName: string;
  getNextServiceRecommendation(): {
    nextMileage: number;
    nextDate: Date;
    isDue: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Service types
export interface IService extends Document {
  _id: Types.ObjectId;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  estimatedDuration: number;
  laborRate: number;
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  tools: string[];
  parts: Array<{
    name: string;
    partNumber: string;
    isRequired: boolean;
    estimatedCost?: number;
    supplier?: string;
  }>;
  vehicleTypes: string[];
  makes: string[];
  priceModifiers: Array<{
    condition: string;
    multiplier?: number;
    additionalCost?: number;
  }>;
  prerequisites: string[];
  followUpServices: string[];
  isActive: boolean;
  isPopular: boolean;
  seasonality: {
    peak: string[];
    low: string[];
  };
  warranty: {
    duration: number;
    description: string;
  };
  instructions: {
    preparation: string[];
    procedure: string[];
    safety: string[];
    quality: string[];
  };
  media: {
    images: string[];
    videos: string[];
    diagrams: string[];
  };
  formattedPrice: string;
  formattedDuration: string;
  calculateTotalCost(vehicleInfo?: Partial<IVehicle>): number;
  createdAt: Date;
  updatedAt: Date;
}

// Appointment types
export interface IAppointment extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  vehicle: Types.ObjectId;
  services: Types.ObjectId[];
  appointmentDate: Date;
  appointmentTime: string;
  estimatedDuration: number;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  bay?: string;
  assignedTechnician?: Types.ObjectId;
  customerConcerns?: string;
  technicianNotes?: string;
  workPerformed: Array<{
    service: string;
    description: string;
    parts: Array<{
      name: string;
      partNumber: string;
      quantity: number;
      cost: number;
    }>;
    laborHours: number;
    laborRate: number;
    completed: boolean;
  }>;
  diagnosis: {
    codes: Array<{
      code: string;
      description: string;
      severity: string;
    }>;
    summary?: string;
    recommendations: string[];
    estimatedCost?: number;
  };
  timeline: Array<{
    timestamp: Date;
    status: string;
    description: string;
    notificationSent: boolean;
  }>;
  estimatedCost: number;
  actualCost: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  remindersSent: {
    appointment: boolean;
    followUp: boolean;
  };
  customerRating?: {
    rating: number;
    feedback?: string;
    date: Date;
  };
  photos: string[];
  documents: string[];
  isActive: boolean;
  displayDateTime: string;
  isOverdue: boolean;
  addTimelineEntry(status: string, description: string): Promise<IAppointment>;
  getProgressPercentage(): number;
  createdAt: Date;
  updatedAt: Date;
}

// Diagnostic types
export interface IDiagnosticCode {
  code: string;
  title: string;
  description: string;
  symptoms: string[];
  causes: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: string;
  category: string;
  system: string;
}

export interface IDiagnosticSession extends Document {
  _id: Types.ObjectId;
  appointment: Types.ObjectId;
  vehicle: Types.ObjectId;
  technician: Types.ObjectId;
  equipment: string;
  codes: Array<{
    code: string;
    status: 'pending' | 'diagnosed' | 'resolved';
    explanation?: string;
    recommendation?: string;
    estimatedCost?: number;
  }>;
  summary?: string;
  recommendations: string[];
  totalEstimatedCost: number;
  reportGenerated: boolean;
  reportUrl?: string;
  customerNotified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Chat types
export interface IChatMessage {
  id: string;
  sessionId: string;
  userId?: string;
  message: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  context?: {
    appointmentId?: string;
    vehicleId?: string;
    serviceId?: string;
  };
}

export interface IChatSession {
  id: string;
  userId?: string;
  isActive: boolean;
  messages: IChatMessage[];
  context: {
    customerInfo?: Partial<IUser>;
    vehicleInfo?: Partial<IVehicle>;
    appointmentInfo?: Partial<IAppointment>;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Invoice types
export interface IInvoice extends Document {
  _id: Types.ObjectId;
  appointment: Types.ObjectId;
  customer: Types.ObjectId;
  vehicle: Types.ObjectId;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  items: Array<{
    type: 'service' | 'part' | 'labor';
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: string;
  paymentDate?: Date;
  notes?: string;
  terms?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Express Request extension
export interface AuthenticatedRequest extends Request {
  user?: IUser;
  io?: Server;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Dashboard types
export interface DashboardStats {
  appointments: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  vehicles: {
    total: number;
    newThisMonth: number;
    dueSoon: number;
  };
  customers: {
    total: number;
    newThisMonth: number;
    active: number;
  };
}

// Notification types
export interface NotificationData {
  type: 'appointment' | 'status_update' | 'invoice' | 'reminder' | 'diagnostic';
  recipient: {
    userId: string;
    email?: string;
    phone?: string;
    method: 'email' | 'sms' | 'both' | 'push';
  };
  subject: string;
  message: string;
  data?: Record<string, any>;
  scheduledFor?: Date;
  sent: boolean;
  sentAt?: Date;
}

// Error types
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}