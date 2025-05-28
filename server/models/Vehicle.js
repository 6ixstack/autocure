const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vin: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 17,
    maxlength: 17
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 2
  },
  trim: {
    type: String,
    trim: true
  },
  engine: {
    type: String,
    trim: true
  },
  transmission: {
    type: String,
    enum: ['manual', 'automatic', 'cvt', 'other'],
    default: 'automatic'
  },
  fuelType: {
    type: String,
    enum: ['gasoline', 'diesel', 'hybrid', 'electric', 'other'],
    default: 'gasoline'
  },
  color: {
    type: String,
    trim: true
  },
  licensePlate: {
    type: String,
    trim: true,
    uppercase: true
  },
  mileage: {
    type: Number,
    min: 0
  },
  lastServiceDate: {
    type: Date
  },
  nextServiceDue: {
    type: Date
  },
  serviceHistory: [{
    date: { type: Date, required: true },
    mileage: { type: Number, required: true },
    services: [{ type: String }],
    notes: String,
    cost: Number,
    technician: String
  }],
  diagnosticHistory: [{
    date: { type: Date, required: true },
    codes: [{
      code: String,
      description: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      }
    }],
    mileage: Number,
    equipment: String, // Autel device model
    technician: String,
    resolved: { type: Boolean, default: false },
    notes: String
  }],
  photos: [String], // URLs to vehicle photos
  documents: [String], // URLs to documents (registration, etc.)
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String], // For categorization (luxury, classic, etc.)
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
vehicleSchema.index({ owner: 1, isActive: 1 });
vehicleSchema.index({ vin: 1 });
vehicleSchema.index({ make: 1, model: 1, year: 1 });

// Virtual for vehicle display name
vehicleSchema.virtual('displayName').get(function() {
  return `${this.year} ${this.make} ${this.model}`;
});

// Get next service recommendation
vehicleSchema.methods.getNextServiceRecommendation = function() {
  const currentMileage = this.mileage || 0;
  const lastService = this.lastServiceDate;
  
  // Basic service interval logic (can be customized)
  const serviceInterval = 5000; // km
  const timeInterval = 6; // months
  
  let nextMileage = Math.ceil(currentMileage / serviceInterval) * serviceInterval + serviceInterval;
  let nextDate = new Date();
  
  if (lastService) {
    nextDate = new Date(lastService);
    nextDate.setMonth(nextDate.getMonth() + timeInterval);
  } else {
    nextDate.setMonth(nextDate.getMonth() + timeInterval);
  }
  
  return {
    nextMileage,
    nextDate,
    isDue: currentMileage >= nextMileage || new Date() >= nextDate
  };
};

module.exports = mongoose.model('Vehicle', vehicleSchema);