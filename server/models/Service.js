const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'oil-change',
      'brake-service', 
      'engine-diagnostics',
      'transmission',
      'electrical',
      'cooling-system',
      'exhaust',
      'suspension',
      'tires-wheels',
      'air-conditioning',
      'battery',
      'preventive-maintenance',
      'emergency-repair'
    ]
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true,
    min: 15
  },
  laborRate: {
    type: Number,
    default: 120 // per hour
  },
  skillLevel: {
    type: String,
    enum: ['basic', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  },
  tools: [String], // Required tools/equipment
  parts: [{
    name: String,
    partNumber: String,
    isRequired: { type: Boolean, default: true },
    estimatedCost: Number,
    supplier: String
  }],
  vehicleTypes: [{
    type: String,
    enum: ['sedan', 'suv', 'truck', 'coupe', 'convertible', 'wagon', 'hatchback', 'van']
  }],
  makes: [String], // Specific vehicle makes this service applies to
  priceModifiers: [{
    condition: String, // e.g., "luxury vehicle", "diesel engine"
    multiplier: Number, // e.g., 1.2 for 20% increase
    additionalCost: Number
  }],
  prerequisites: [String], // Services that should be done first
  followUpServices: [String], // Recommended follow-up services
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  seasonality: {
    peak: [String], // months when service is most needed
    low: [String]
  },
  warranty: {
    duration: Number, // in days
    description: String
  },
  instructions: {
    preparation: [String],
    procedure: [String],
    safety: [String],
    quality: [String]
  },
  media: {
    images: [String], // URLs to service images
    videos: [String], // URLs to instructional videos
    diagrams: [String] // URLs to technical diagrams
  }
}, {
  timestamps: true
});

// Index for efficient queries
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ name: 'text', description: 'text' });
serviceSchema.index({ basePrice: 1 });
serviceSchema.index({ isPopular: 1 });

// Virtual for formatted price
serviceSchema.virtual('formattedPrice').get(function() {
  return `$${this.basePrice.toFixed(2)}`;
});

// Calculate total estimated cost including parts
serviceSchema.methods.calculateTotalCost = function(vehicleInfo = {}) {
  let totalCost = this.basePrice;
  
  // Add parts cost
  const partsCost = this.parts.reduce((sum, part) => {
    return sum + (part.estimatedCost || 0);
  }, 0);
  
  totalCost += partsCost;
  
  // Apply price modifiers based on vehicle
  this.priceModifiers.forEach(modifier => {
    // Simple condition matching (can be enhanced)
    if (vehicleInfo.make && modifier.condition.toLowerCase().includes(vehicleInfo.make.toLowerCase())) {
      if (modifier.multiplier) {
        totalCost *= modifier.multiplier;
      }
      if (modifier.additionalCost) {
        totalCost += modifier.additionalCost;
      }
    }
  });
  
  return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
};

// Get duration in human readable format
serviceSchema.virtual('formattedDuration').get(function() {
  const hours = Math.floor(this.estimatedDuration / 60);
  const minutes = this.estimatedDuration % 60;
  
  if (hours === 0) {
    return `${minutes} minutes`;
  } else if (minutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
  }
});

// Static method to get popular services
serviceSchema.statics.getPopularServices = function() {
  return this.find({ isPopular: true, isActive: true }).sort({ name: 1 });
};

// Static method to get services by category
serviceSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ basePrice: 1 });
};

module.exports = mongoose.model('Service', serviceSchema);