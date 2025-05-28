import mongoose, { Schema } from 'mongoose';
import { IAppointment } from '@/types';

const appointmentSchema = new Schema<IAppointment>({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer is required']
  },
  vehicle: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle is required']
  },
  services: [{
    type: Schema.Types.ObjectId,
    ref: 'Service'
  }],
  appointmentDate: {
    type: Date,
    required: [true, 'Appointment date is required']
  },
  appointmentTime: {
    type: String,
    required: [true, 'Appointment time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
  },
  estimatedDuration: {
    type: Number,
    default: 60,
    min: [15, 'Duration must be at least 15 minutes']
  },
  status: {
    type: String,
    enum: {
      values: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
      message: 'Invalid appointment status'
    },
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'normal', 'high', 'urgent'],
      message: 'Invalid priority level'
    },
    default: 'normal'
  },
  bay: {
    type: String,
    enum: ['bay1', 'bay2', 'bay3', 'bay4', 'bay5'],
    default: undefined
  },
  assignedTechnician: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  customerConcerns: {
    type: String,
    trim: true,
    maxlength: [1000, 'Customer concerns cannot exceed 1000 characters']
  },
  technicianNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Technician notes cannot exceed 1000 characters']
  },
  workPerformed: [{
    service: { type: String, required: true },
    description: { type: String, required: true },
    parts: [{
      name: { type: String, required: true },
      partNumber: String,
      quantity: { type: Number, required: true, min: 1 },
      cost: { type: Number, required: true, min: 0 }
    }],
    laborHours: { type: Number, min: 0 },
    laborRate: { type: Number, min: 0 },
    completed: { type: Boolean, default: false }
  }],
  diagnosis: {
    codes: [{
      code: String,
      description: String,
      severity: String
    }],
    summary: String,
    recommendations: [String],
    estimatedCost: Number
  },
  timeline: [{
    timestamp: { type: Date, default: Date.now },
    status: { type: String, required: true },
    description: { type: String, required: true },
    notificationSent: { type: Boolean, default: false }
  }],
  estimatedCost: {
    type: Number,
    default: 0,
    min: [0, 'Cost cannot be negative']
  },
  actualCost: {
    type: Number,
    default: 0,
    min: [0, 'Cost cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'partial', 'paid', 'refunded'],
      message: 'Invalid payment status'
    },
    default: 'pending'
  },
  remindersSent: {
    appointment: { type: Boolean, default: false },
    followUp: { type: Boolean, default: false }
  },
  customerRating: {
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    date: Date
  },
  photos: [String],
  documents: [String],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
appointmentSchema.index({ customer: 1, appointmentDate: 1 });
appointmentSchema.index({ assignedTechnician: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ bay: 1, appointmentDate: 1 });

// Virtual for appointment display
appointmentSchema.virtual('displayDateTime').get(function(): string {
  return `${this.appointmentDate.toDateString()} at ${this.appointmentTime}`;
});

// Add timeline entry method
appointmentSchema.methods.addTimelineEntry = function(status: string, description: string) {
  this.timeline.push({
    status,
    description,
    timestamp: new Date()
  });
  this.status = status;
  return this.save();
};

// Get current progress percentage
appointmentSchema.methods.getProgressPercentage = function(): number {
  const statusProgress = {
    'scheduled': 10,
    'confirmed': 20,
    'in-progress': 60,
    'completed': 100,
    'cancelled': 0,
    'no-show': 0
  };
  return statusProgress[this.status as keyof typeof statusProgress] || 0;
};

// Check if appointment is overdue
appointmentSchema.virtual('isOverdue').get(function(): boolean {
  const appointmentDateTime = new Date(this.appointmentDate);
  const [hours, minutes] = this.appointmentTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));
  
  return new Date() > appointmentDateTime && this.status === 'scheduled';
});

// Transform JSON output
appointmentSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

export default mongoose.model<IAppointment>('Appointment', appointmentSchema);