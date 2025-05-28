const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const appointmentRoutes = require('./routes/appointments');
const vehicleRoutes = require('./routes/vehicles');
const serviceRoutes = require('./routes/services');
const diagnosticRoutes = require('./routes/diagnostics');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const invoiceRoutes = require('./routes/invoices');

// Import socket handlers
const socketHandler = require('./socket/socketHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
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
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Socket.IO
socketHandler(io);

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
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
    service: 'AutoCure AI Platform'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autocure')
  .then(() => console.log('📊 Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 AutoCure AI Platform server running on port ${PORT}`);
  console.log(`🤖 AI-powered auto shop management system ready!`);
});