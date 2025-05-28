import mongoose, { Schema } from 'mongoose';
import { IVehicle } from '@/types';

const vehicleSchema = new Schema<IVehicle>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vehicle owner is required']
  },
  vin: {
    type: String,
    required: [true, 'VIN is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [17, 'VIN must be exactly 17 characters'],
    maxlength: [17, 'VIN must be exactly 17 characters'],
    match: [/^[A-HJ-NPR-Z0-9]{17}$/, 'Invalid VIN format']
  },
  make: {
    type: String,
    required: [true, 'Vehicle make is required'],
    trim: true,
    maxlength: [50, 'Make cannot exceed 50 characters']
  },
  vehicleModel: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true,
    maxlength: [50, 'Model cannot exceed 50 characters']
  },
  year: {
    type: Number,
    required: [true, 'Vehicle year is required'],
    min: [1900, 'Year must be 1900 or later'],
    max: [new Date().getFullYear() + 2, 'Year cannot be more than 2 years in the future']
  },
  trim: {
    type: String,
    trim: true,
    maxlength: [50, 'Trim cannot exceed 50 characters']
  },
  engine: {
    type: String,
    trim: true,
    maxlength: [100, 'Engine description cannot exceed 100 characters']
  },
  transmission: {
    type: String,
    enum: {
      values: ['manual', 'automatic', 'cvt', 'other'],
      message: 'Transmission must be manual, automatic, cvt, or other'
    },
    default: 'automatic'
  },
  fuelType: {
    type: String,
    enum: {
      values: ['gasoline', 'diesel', 'hybrid', 'electric', 'other'],
      message: 'Fuel type must be gasoline, diesel, hybrid, electric, or other'
    },
    default: 'gasoline'
  },
  color: {
    type: String,
    trim: true,
    maxlength: [30, 'Color cannot exceed 30 characters']
  },
  licensePlate: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [20, 'License plate cannot exceed 20 characters']
  },
  mileage: {
    type: Number,
    min: [0, 'Mileage cannot be negative'],
    max: [1000000, 'Mileage seems unrealistic']
  },
  lastServiceDate: {
    type: Date
  },
  nextServiceDue: {
    type: Date
  },
  serviceHistory: [{
    date: { 
      type: Date, 
      required: [true, 'Service date is required']
    },
    mileage: { 
      type: Number, 
      required: [true, 'Service mileage is required'],
      min: [0, 'Mileage cannot be negative']
    },
    services: [{ 
      type: String,
      required: [true, 'At least one service must be specified']
    }],
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative']
    },
    technician: {
      type: String,
      maxlength: [100, 'Technician name cannot exceed 100 characters']
    }
  }],
  diagnosticHistory: [{
    date: { 
      type: Date, 
      required: [true, 'Diagnostic date is required']
    },
    codes: [{
      code: {
        type: String,
        required: [true, 'Diagnostic code is required'],
        match: [/^[PBU][0-9A-F]{4}$/i, 'Invalid diagnostic code format']
      },
      description: {
        type: String,
        required: [true, 'Code description is required']
      },
      severity: {
        type: String,
        enum: {
          values: ['low', 'medium', 'high', 'critical'],
          message: 'Severity must be low, medium, high, or critical'
        },
        default: 'medium'
      }
    }],
    mileage: {
      type: Number,
      min: [0, 'Mileage cannot be negative']
    },
    equipment: {
      type: String,
      maxlength: [100, 'Equipment name cannot exceed 100 characters']
    },
    technician: {
      type: String,
      maxlength: [100, 'Technician name cannot exceed 100 characters']
    },
    resolved: { 
      type: Boolean, 
      default: false 
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
  }],
  photos: [{
    type: String,
    match: [/^https?:\/\/.+/, 'Photo must be a valid URL']
  }],
  documents: [{
    type: String,
    match: [/^https?:\/\/.+/, 'Document must be a valid URL']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
vehicleSchema.index({ owner: 1, isActive: 1 });
vehicleSchema.index({ vin: 1 });
vehicleSchema.index({ make: 1, vehicleModel: 1, year: 1 });
vehicleSchema.index({ licensePlate: 1 });
vehicleSchema.index({ nextServiceDue: 1 });

// Virtual for vehicle display name
vehicleSchema.virtual('displayName').get(function(): string {
  return `${this.year} ${this.make} ${this.vehicleModel}`;
});

// Method to get next service recommendation
vehicleSchema.methods.getNextServiceRecommendation = function() {
  const currentMileage = this.mileage || 0;
  const lastService = this.lastServiceDate;
  
  // Basic service interval logic (can be customized per vehicle type)
  const serviceInterval = this.make?.toLowerCase().includes('luxury') ? 8000 : 5000; // km
  const timeInterval = 6; // months
  
  let nextMileage = Math.ceil(currentMileage / serviceInterval) * serviceInterval + serviceInterval;
  let nextDate = new Date();
  
  if (lastService) {
    nextDate = new Date(lastService);
    nextDate.setMonth(nextDate.getMonth() + timeInterval);
  } else {
    nextDate.setMonth(nextDate.getMonth() + timeInterval);
  }
  
  const isDue = currentMileage >= nextMileage || new Date() >= nextDate;
  
  return {
    nextMileage,
    nextDate,
    isDue
  };
};

// Static methods
vehicleSchema.statics.findByOwner = function(ownerId: string) {
  return this.find({ owner: ownerId, isActive: true }).sort({ createdAt: -1 });
};

vehicleSchema.statics.findByVin = function(vin: string) {
  return this.findOne({ vin: vin.toUpperCase(), isActive: true });
};

vehicleSchema.statics.findDueForService = function() {
  const today = new Date();
  return this.find({
    isActive: true,
    $or: [
      { nextServiceDue: { $lte: today } },
      { nextServiceDue: null, lastServiceDate: { $lte: new Date(today.getTime() - 6 * 30 * 24 * 60 * 60 * 1000) } }
    ]
  });
};

// Transform JSON output
vehicleSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

export default mongoose.model<IVehicle>('Vehicle', vehicleSchema);