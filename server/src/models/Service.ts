import mongoose, { Schema } from 'mongoose';
import { IService } from '@/types';

const serviceSchema = new Schema<IService>({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: {
      values: [
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
      ],
      message: 'Invalid service category'
    }
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  basePrice: {
    type: Number,
    required: [true, 'Base price is required'],
    min: [0, 'Price cannot be negative']
  },
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [15, 'Duration must be at least 15 minutes']
  },
  laborRate: {
    type: Number,
    default: 120,
    min: [0, 'Labor rate cannot be negative']
  },
  skillLevel: {
    type: String,
    enum: {
      values: ['basic', 'intermediate', 'advanced', 'expert'],
      message: 'Invalid skill level'
    },
    default: 'intermediate'
  },
  tools: [String],
  parts: [{
    name: { type: String, required: true },
    partNumber: String,
    isRequired: { type: Boolean, default: true },
    estimatedCost: { type: Number, min: 0 },
    supplier: String
  }],
  vehicleTypes: [{
    type: String,
    enum: ['sedan', 'suv', 'truck', 'coupe', 'convertible', 'wagon', 'hatchback', 'van']
  }],
  makes: [String],
  priceModifiers: [{
    condition: { type: String, required: true },
    multiplier: { type: Number, min: 0 },
    additionalCost: { type: Number, min: 0 }
  }],
  prerequisites: [String],
  followUpServices: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  seasonality: {
    peak: [String],
    low: [String]
  },
  warranty: {
    duration: { type: Number, min: 0 },
    description: String
  },
  instructions: {
    preparation: [String],
    procedure: [String],
    safety: [String],
    quality: [String]
  },
  media: {
    images: [String],
    videos: [String],
    diagrams: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Text index for search
serviceSchema.index({ name: 'text', description: 'text' });
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ basePrice: 1 });
serviceSchema.index({ isPopular: 1 });

// Virtual for formatted price
serviceSchema.virtual('formattedPrice').get(function(): string {
  return `$${this.basePrice.toFixed(2)}`;
});

// Calculate total estimated cost including parts
serviceSchema.methods.calculateTotalCost = function(vehicleInfo: any = {}): number {
  let totalCost = this.basePrice;
  
  // Add parts cost
  const partsCost = this.parts.reduce((sum, part) => {
    return sum + (part.estimatedCost || 0);
  }, 0);
  
  totalCost += partsCost;
  
  // Apply price modifiers based on vehicle
  this.priceModifiers.forEach(modifier => {
    if (vehicleInfo.make && modifier.condition.toLowerCase().includes(vehicleInfo.make.toLowerCase())) {
      if (modifier.multiplier) {
        totalCost *= modifier.multiplier;
      }
      if (modifier.additionalCost) {
        totalCost += modifier.additionalCost;
      }
    }
  });
  
  return Math.round(totalCost * 100) / 100;
};

// Get duration in human readable format
serviceSchema.virtual('formattedDuration').get(function(): string {
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
serviceSchema.statics.getByCategory = function(category: string) {
  return this.find({ category, isActive: true }).sort({ basePrice: 1 });
};

// Transform JSON output
serviceSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

export default mongoose.model<IService>('Service', serviceSchema);