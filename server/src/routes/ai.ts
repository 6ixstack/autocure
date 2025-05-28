import express from 'express';
import { body, validationResult } from 'express-validator';
import { optionalAuth } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/errorHandler';
import azureOpenAI from '@/services/azureOpenAI';
import User from '@/models/User';
import Vehicle from '@/models/Vehicle';
import Appointment from '@/models/Appointment';
import { AuthenticatedRequest, AppError, ApiResponse, IChatSession, IChatMessage } from '@/types';

const router = express.Router();

// In-memory chat sessions (in production, use Redis or database)
const chatSessions = new Map<string, IChatSession>();

// Chat validation
const chatValidation = [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  body('sessionId').optional().isString().withMessage('Session ID must be a string'),
  body('context.appointmentId').optional().isMongoId().withMessage('Invalid appointment ID'),
  body('context.vehicleId').optional().isMongoId().withMessage('Invalid vehicle ID')
];

// Get or create chat session
const getOrCreateSession = (sessionId?: string, userId?: string): IChatSession => {
  const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  if (chatSessions.has(id)) {
    return chatSessions.get(id)!;
  }

  const newSession: IChatSession = {
    id,
    userId,
    isActive: true,
    messages: [],
    context: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };

  chatSessions.set(id, newSession);
  return newSession;
};

// Chat with AI
router.post('/chat', optionalAuth, chatValidation, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { message, sessionId, context = {} } = req.body;
  const userId = req.user?._id.toString();

  // Get or create session
  const session = getOrCreateSession(sessionId, userId);

  // Enrich context with user data if available
  let enrichedContext = { ...session.context };

  if (req.user) {
    enrichedContext.customerInfo = {
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      phone: req.user.phone
    };
  }

  // Add context from request
  if (context.appointmentId) {
    const appointment = await Appointment.findById(context.appointmentId)
      .populate('customer', 'firstName lastName email phone')
      .populate('vehicle', 'year make model vin');
    
    if (appointment) {
      enrichedContext.appointmentInfo = {
        status: appointment.status,
        appointmentDate: appointment.appointmentDate,
        appointmentTime: appointment.appointmentTime,
        customerConcerns: appointment.customerConcerns
      };
      
      if (appointment.vehicle) {
        enrichedContext.vehicleInfo = appointment.vehicle;
      }
    }
  }

  if (context.vehicleId && !enrichedContext.vehicleInfo) {
    const vehicle = await Vehicle.findById(context.vehicleId);
    if (vehicle) {
      enrichedContext.vehicleInfo = vehicle;
    }
  }

  // Create user message
  const userMessage: IChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId: session.id,
    userId,
    message,
    sender: 'user',
    timestamp: new Date(),
    context
  };

  session.messages.push(userMessage);

  try {
    // Generate AI response
    const chatMessages = session.messages.slice(-10).map(msg => ({
      role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.message
    }));

    const aiResponse = await azureOpenAI.generateChatResponse(chatMessages, enrichedContext);

    // Create AI message
    const aiMessage: IChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      message: aiResponse,
      sender: 'ai',
      timestamp: new Date()
    };

    session.messages.push(aiMessage);
    session.context = enrichedContext;
    session.updatedAt = new Date();

    // Emit real-time update if socket is available
    if ((req as any).io && userId) {
      (req as any).io.to(`user_${userId}`).emit('chat_message', aiMessage);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Chat response generated',
      data: {
        sessionId: session.id,
        message: aiMessage,
        context: enrichedContext
      }
    };

    res.json(response);
  } catch (error) {
    console.error('AI chat error:', error);
    
    // Fallback response
    const fallbackMessage: IChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: session.id,
      message: "I'm sorry, I'm having trouble right now. Please call us at +1-905-123-4567 for immediate assistance.",
      sender: 'ai',
      timestamp: new Date()
    };

    session.messages.push(fallbackMessage);

    const response: ApiResponse = {
      success: true,
      message: 'Fallback response provided',
      data: {
        sessionId: session.id,
        message: fallbackMessage,
        context: enrichedContext
      }
    };

    res.json(response);
  }
}));

// Get chat history
router.get('/chat/:sessionId', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { sessionId } = req.params;
  const session = chatSessions.get(sessionId);

  if (!session) {
    throw new AppError('Chat session not found', 404);
  }

  // Check ownership for authenticated users
  if (req.user && session.userId && session.userId !== req.user._id.toString()) {
    throw new AppError('Access denied to this chat session', 403);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Chat history retrieved',
    data: {
      session: {
        id: session.id,
        messages: session.messages,
        context: session.context,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
    }
  };

  res.json(response);
}));

// Get diagnostic explanation
router.post('/diagnostic/explain', optionalAuth, [
  body('code').matches(/^[PBU][0-9A-F]{4}$/i).withMessage('Invalid diagnostic code format'),
  body('vehicleId').optional().isMongoId().withMessage('Invalid vehicle ID')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { code, vehicleId } = req.body;
  let vehicleInfo = {};

  if (vehicleId) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (vehicle) {
      // Check ownership for customers
      if (req.user && req.user.role === 'customer' && vehicle.owner.toString() !== req.user._id.toString()) {
        throw new AppError('Access denied to this vehicle', 403);
      }
      vehicleInfo = vehicle;
    }
  }

  const explanation = await azureOpenAI.generateDiagnosticExplanation(code.toUpperCase(), vehicleInfo);

  const response: ApiResponse = {
    success: true,
    message: 'Diagnostic explanation generated',
    data: {
      code: code.toUpperCase(),
      explanation,
      vehicleInfo: vehicleId ? vehicleInfo : undefined
    }
  };

  res.json(response);
}));

// Get service recommendations
router.post('/recommendations', optionalAuth, [
  body('vehicleId').isMongoId().withMessage('Valid vehicle ID is required'),
  body('symptoms').optional().isArray().withMessage('Symptoms must be an array'),
  body('symptoms.*').optional().isString().withMessage('Each symptom must be a string')
], asyncHandler(async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0]?.msg || 'Validation failed', 400);
  }

  const { vehicleId, symptoms = [] } = req.body;

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  // Check ownership for customers
  if (req.user && req.user.role === 'customer' && vehicle.owner.toString() !== req.user._id.toString()) {
    throw new AppError('Access denied to this vehicle', 403);
  }

  const recommendations = await azureOpenAI.generateServiceRecommendations(vehicle, symptoms);

  const response: ApiResponse = {
    success: true,
    message: 'Service recommendations generated',
    data: {
      vehicleId,
      recommendations,
      symptoms
    }
  };

  res.json(response);
}));

// AI system status
router.get('/status', asyncHandler(async (req, res) => {
  const status = azureOpenAI.getStatus();

  const response: ApiResponse = {
    success: true,
    message: 'AI system status retrieved',
    data: {
      ...status,
      activeSessions: chatSessions.size,
      uptime: process.uptime()
    }
  };

  res.json(response);
}));

// Clear old chat sessions (cleanup endpoint)
router.delete('/sessions/cleanup', asyncHandler(async (req, res) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  let cleaned = 0;

  for (const [sessionId, session] of chatSessions.entries()) {
    if (session.updatedAt < oneHourAgo && !session.isActive) {
      chatSessions.delete(sessionId);
      cleaned++;
    }
  }

  const response: ApiResponse = {
    success: true,
    message: `Cleaned up ${cleaned} inactive chat sessions`,
    data: {
      cleanedSessions: cleaned,
      remainingSessions: chatSessions.size
    }
  };

  res.json(response);
}));

export default router;