const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  appointmentDate: {
    type: Date,
    required: true
  },
  appointmentTime: {
    type: String,
    required: true
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 60
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  bay: {
    type: String,
    enum: ['bay1', 'bay2', 'bay3', 'bay4', 'bay5'],
    default: null
  },
  assignedTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customerConcerns: {
    type: String,
    trim: true
  },
  technicianNotes: {
    type: String,
    trim: true
  },
  workPerformed: [{
    service: String,
    description: String,
    parts: [{
      name: String,
      partNumber: String,
      quantity: Number,
      cost: Number
    }],
    laborHours: Number,
    laborRate: Number,
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
    status: String,
    description: String,
    notificationSent: { type: Boolean, default: false }
  }],
  estimatedCost: {
    type: Number,
    default: 0
  },
  actualCost: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
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
  photos: [String], // URLs to photos taken during service
  documents: [String], // URLs to generated reports, invoices
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
appointmentSchema.index({ customer: 1, appointmentDate: 1 });
appointmentSchema.index({ assignedTechnician: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });
appointmentSchema.index({ bay: 1, appointmentDate: 1 });

// Virtual for appointment display
appointmentSchema.virtual('displayDateTime').get(function() {
  return `${this.appointmentDate.toDateString()} at ${this.appointmentTime}`;
});

// Add timeline entry method
appointmentSchema.methods.addTimelineEntry = function(status, description) {
  this.timeline.push({
    status,
    description,
    timestamp: new Date()
  });
  this.status = status;
  return this.save();
};

// Get current progress percentage
appointmentSchema.methods.getProgressPercentage = function() {
  const statusProgress = {
    'scheduled': 10,
    'confirmed': 20,
    'in-progress': 60,
    'completed': 100,
    'cancelled': 0,
    'no-show': 0
  };
  return statusProgress[this.status] || 0;
};

// Check if appointment is overdue
appointmentSchema.virtual('isOverdue').get(function() {
  const appointmentDateTime = new Date(this.appointmentDate);
  const [hours, minutes] = this.appointmentTime.split(':');
  appointmentDateTime.setHours(parseInt(hours), parseInt(minutes));
  
  return new Date() > appointmentDateTime && this.status === 'scheduled';
});

module.exports = mongoose.model('Appointment', appointmentSchema);