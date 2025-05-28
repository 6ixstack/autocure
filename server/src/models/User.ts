import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '@/types';

const userSchema = new Schema<IUser>({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['customer', 'staff', 'admin'],
    default: 'customer'
  },
  avatar: {
    type: String,
    default: null
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
    postalCode: { 
      type: String, 
      trim: true,
      match: [/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, 'Please enter a valid Canadian postal code']
    },
    country: { type: String, trim: true, default: 'Canada' }
  },
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    communicationMethod: {
      type: String,
      enum: ['email', 'sms', 'both'],
      default: 'both'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ firstName: 1, lastName: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Get full name virtual
userSchema.virtual('fullName').get(function(): string {
  return `${this.firstName} ${this.lastName}`;
});

// Transform JSON output (remove password)
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase(), isActive: true });
};

userSchema.statics.findActiveUsers = function(role?: string) {
  const query: any = { isActive: true };
  if (role) query.role = role;
  return this.find(query).sort({ createdAt: -1 });
};

export default mongoose.model<IUser>('User', userSchema);