import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '@/models/User';

interface SocketUser {
  id: string;
  role: string;
  email: string;
}

interface AuthenticatedSocket {
  user?: SocketUser;
}

const socketHandler = (io: Server): void => {
  // Authentication middleware for sockets
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        // Allow anonymous connections for public chat
        return next();
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error('JWT secret not configured'));
      }

      const decoded = jwt.verify(token, jwtSecret) as any;
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role,
        email: user.email
      };

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: any) => {
    console.log(`🔗 Socket connected: ${socket.id}${socket.user ? ` (${socket.user.email})` : ' (anonymous)'}`);

    // Join user-specific room for authenticated users
    if (socket.user) {
      socket.join(`user_${socket.user.id}`);
      
      // Join role-based rooms
      socket.join(`role_${socket.user.role}`);
      
      if (socket.user.role === 'staff' || socket.user.role === 'admin') {
        socket.join('staff');
      }
    }

    // Handle chat messages
    socket.on('chat_message', (data: any) => {
      const { sessionId, message, context } = data;
      
      // Broadcast to relevant rooms or handle privately
      if (socket.user) {
        // Authenticated user message
        socket.to(`user_${socket.user.id}`).emit('chat_message', {
          sessionId,
          message,
          sender: 'user',
          timestamp: new Date(),
          context
        });
        
        // Notify staff if it's a customer message
        if (socket.user.role === 'customer') {
          socket.to('staff').emit('customer_message', {
            customerId: socket.user.id,
            sessionId,
            message,
            timestamp: new Date()
          });
        }
      }
    });

    // Handle appointment updates
    socket.on('appointment_update', (data: any) => {
      if (!socket.user || (socket.user.role !== 'staff' && socket.user.role !== 'admin')) {
        return;
      }

      const { appointmentId, customerId, status, notes } = data;
      
      // Notify customer about their appointment update
      socket.to(`user_${customerId}`).emit('appointment_updated', {
        appointmentId,
        status,
        notes,
        timestamp: new Date()
      });

      // Notify all staff
      socket.to('staff').emit('appointment_status_changed', {
        appointmentId,
        status,
        updatedBy: socket.user.id,
        timestamp: new Date()
      });
    });

    // Handle vehicle diagnostic updates
    socket.on('diagnostic_update', (data: any) => {
      if (!socket.user || (socket.user.role !== 'staff' && socket.user.role !== 'admin')) {
        return;
      }

      const { vehicleId, customerId, diagnosticData } = data;
      
      // Notify customer about diagnostic results
      socket.to(`user_${customerId}`).emit('diagnostic_results', {
        vehicleId,
        diagnosticData,
        timestamp: new Date()
      });
    });

    // Handle service status updates
    socket.on('service_progress', (data: any) => {
      if (!socket.user || (socket.user.role !== 'staff' && socket.user.role !== 'admin')) {
        return;
      }

      const { appointmentId, customerId, progress, description } = data;
      
      // Notify customer about service progress
      socket.to(`user_${customerId}`).emit('service_progress_update', {
        appointmentId,
        progress,
        description,
        timestamp: new Date()
      });
    });

    // Handle real-time notifications
    socket.on('send_notification', (data: any) => {
      if (!socket.user || (socket.user.role !== 'staff' && socket.user.role !== 'admin')) {
        return;
      }

      const { targetUserId, type, title, message, data: notificationData } = data;
      
      // Send notification to specific user
      socket.to(`user_${targetUserId}`).emit('notification', {
        type,
        title,
        message,
        data: notificationData,
        timestamp: new Date()
      });
    });

    // Handle typing indicators for chat
    socket.on('typing_start', (data: any) => {
      const { sessionId } = data;
      socket.broadcast.emit('user_typing', {
        sessionId,
        userId: socket.user?.id,
        userEmail: socket.user?.email
      });
    });

    socket.on('typing_stop', (data: any) => {
      const { sessionId } = data;
      socket.broadcast.emit('user_stopped_typing', {
        sessionId,
        userId: socket.user?.id
      });
    });

    // Handle presence updates
    socket.on('update_presence', (status: string) => {
      if (!socket.user) return;
      
      socket.broadcast.emit('user_presence_changed', {
        userId: socket.user.id,
        status,
        timestamp: new Date()
      });
    });

    // Handle staff dashboard updates
    socket.on('dashboard_update', (data: any) => {
      if (!socket.user || (socket.user.role !== 'staff' && socket.user.role !== 'admin')) {
        return;
      }

      // Broadcast dashboard updates to all staff
      socket.to('staff').emit('dashboard_data_updated', {
        ...data,
        updatedBy: socket.user.id,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}${socket.user ? ` (${socket.user.email})` : ' (anonymous)'}`);
      
      if (socket.user) {
        // Notify others about user going offline
        socket.broadcast.emit('user_presence_changed', {
          userId: socket.user.id,
          status: 'offline',
          timestamp: new Date()
        });
      }
    });

    // Handle errors
    socket.on('error', (error: any) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Periodic cleanup and maintenance
  setInterval(() => {
    const socketCount = io.sockets.sockets.size;
    console.log(`📊 Active socket connections: ${socketCount}`);
  }, 300000); // Every 5 minutes
};

export default socketHandler;