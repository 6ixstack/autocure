import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import customerRoutes from './routes/customers';
import appointmentRoutes from './routes/appointments';
import vehicleRoutes from './routes/vehicles';
import serviceRoutes from './routes/services';
import diagnosticRoutes from './routes/diagnostics';
import aiRoutes from './routes/ai';
import dashboardRoutes from './routes/dashboard';
import invoiceRoutes from './routes/invoices';

// Import socket handlers
import socketHandler from './socket/socketHandler';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Socket.IO
socketHandler(io);

// Make io accessible to routes
app.use((req, res, next) => {
  (req as any).io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AutoCure AI Platform',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection
const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autocure';
    await mongoose.connect(mongoUri);
    console.log('📊 Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(`🚀 AutoCure AI Platform server running on port ${PORT}`);
    console.log(`🤖 AI-powered auto shop management system ready!`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});