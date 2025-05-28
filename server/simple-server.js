const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'AutoCure AI Platform',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// AI Chat endpoint with Azure OpenAI integration
app.post('/api/ai/chat', async (req, res) => {
  const { message } = req.body;
  
  try {
    // Try Azure OpenAI first
    if (process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY) {
      const response = await callAzureOpenAI(message);
      return res.json({
        success: true,
        message: 'Chat response generated',
        data: {
          sessionId: 'demo-session-' + Date.now(),
          message: {
            id: 'msg-' + Date.now(),
            message: response,
            sender: 'ai',
            timestamp: new Date()
          }
        }
      });
    }
  } catch (error) {
    console.error('Azure OpenAI error:', error);
  }
  
  // Fallback to mock responses
  let response = "Welcome to AutoCure! I'm here to help with your European vehicle needs.";
  
  if (message.toLowerCase().includes('hours')) {
    response = "We're open Monday-Friday 8:00 AM - 6:00 PM, Saturday 9:00 AM - 4:00 PM, and closed Sundays. How can I help you today?";
  } else if (message.toLowerCase().includes('price') || message.toLowerCase().includes('cost')) {
    response = "Our services start from $89 for oil changes, $299 for brake service, and $149 for diagnostics. What service are you interested in?";
  } else if (message.toLowerCase().includes('appointment')) {
    response = "I'd be happy to help you schedule an appointment! We have availability this week. What type of service do you need?";
  } else if (message.toLowerCase().includes('bmw') || message.toLowerCase().includes('mercedes') || message.toLowerCase().includes('audi')) {
    response = "Perfect! We specialize in European vehicles with over 20 years of experience. Our certified technicians are experts with your vehicle.";
  }

  res.json({
    success: true,
    message: 'Chat response generated (mock mode)',
    data: {
      sessionId: 'demo-session-' + Date.now(),
      message: {
        id: 'msg-' + Date.now(),
        message: response,
        sender: 'ai',
        timestamp: new Date()
      }
    }
  });
});

// Azure OpenAI helper function
async function callAzureOpenAI(userMessage) {
  const axios = require('axios');
  
  const systemPrompt = `You are an AI assistant for AutoCure, a professional European auto repair shop specializing in BMW, Mercedes-Benz, Audi, Volkswagen, and Porsche vehicles in Brampton, Ontario.

SHOP INFORMATION:
- Name: AutoCure
- Address: 123 Main St, Brampton, ON L6T 4M5
- Phone: +1-905-123-4567
- Email: info@autocure.net
- Website: https://autocure.net
- Hours: Monday-Friday 8:00 AM - 6:00 PM, Saturday 9:00 AM - 4:00 PM, Closed Sunday
- Specialization: European vehicles (20+ years experience)

SERVICES WE OFFER:
- Oil changes and routine maintenance ($80-120)
- Brake service and repair ($200-400)
- Engine diagnostics and repair ($150-200)
- Transmission service ($300-800)
- Electrical system diagnostics ($150-300)
- Battery replacement ($180-250)
- Cooling system service ($200-500)
- Exhaust system repair ($250-600)
- Suspension and steering ($300-1000)
- Air conditioning service ($200-500)
- Pre-purchase inspections ($100-150)
- Emergency repairs (varies)

YOUR ROLE:
- Help customers with inquiries about services, pricing, and scheduling
- Provide accurate information about repair processes
- Assist with appointment booking and rescheduling
- Explain diagnostic codes and repair recommendations
- Maintain a professional, helpful, and knowledgeable tone
- Always prioritize safety and quality in your recommendations

GUIDELINES:
- Be concise but informative (2-3 sentences preferred)
- Ask clarifying questions when needed
- Provide realistic timeframes and pricing estimates
- Emphasize our expertise with European vehicles
- For appointments, check availability and confirm details
- For urgent issues, recommend immediate attention
- Always offer to connect with human staff for complex matters

Remember: You represent AutoCure's commitment to quality European auto repair. Be helpful, professional, and accurate in all responses.`;

  const response = await axios.post(
    `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=2024-02-01`,
    {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 800,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY
      }
    }
  );

  return response.data.choices[0]?.message?.content || 'I apologize, I could not generate a response at this time.';
}

// Services endpoint
app.get('/api/services', (req, res) => {
  const services = [
    {
      id: '1',
      name: 'Oil Change & Filter',
      category: 'oil-change',
      description: 'Complete oil change with premium synthetic oil and new filter',
      basePrice: 89.99,
      estimatedDuration: 45,
      isPopular: true
    },
    {
      id: '2',
      name: 'Brake Pad Replacement',
      category: 'brake-service',
      description: 'Replace brake pads with OEM quality parts',
      basePrice: 299.99,
      estimatedDuration: 120,
      isPopular: true
    },
    {
      id: '3',
      name: 'Engine Diagnostics',
      category: 'engine-diagnostics',
      description: 'Comprehensive diagnostic scan using professional Autel equipment',
      basePrice: 149.99,
      estimatedDuration: 60,
      isPopular: true
    }
  ];

  res.json({
    success: true,
    message: 'Services retrieved successfully',
    data: { services }
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email && password) {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: '1',
          firstName: 'Demo',
          lastName: 'User',
          email: email,
          role: 'customer'
        },
        token: 'demo-jwt-token-' + Date.now()
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Email and password required'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;
  
  if (firstName && lastName && email && password) {
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: Date.now().toString(),
          firstName,
          lastName,
          email,
          phone,
          role: 'customer'
        },
        token: 'demo-jwt-token-' + Date.now()
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Use the MongoDB Atlas connection format with proper options
    const mongoOptions = {
      serverApi: {
        version: mongoose.mongo.ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    };
    
    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    console.log('📊 Connected to MongoDB Atlas successfully with Mongoose!');
    
    // Test the connection with a ping
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log('✅ MongoDB ping successful - database is ready for AutoCure!');
    
    // Log connection info
    console.log(`🗄️  Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🌐 Connected to: ${mongoose.connection.host}`);
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('🔄 Running in offline mode with mock data');
    
    // Log more details for debugging
    if (error.message.includes('authentication failed')) {
      console.log('💡 Tip: Check your MongoDB Atlas username and password');
      console.log('💡 Make sure your IP is whitelisted in MongoDB Atlas');
    }
  }
};

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 AutoCure AI Platform server running on port ${PORT}`);
  console.log(`🌐 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🤖 AI Chat: http://localhost:${PORT}/api/ai/chat`);
  console.log(`⚙️  Services: http://localhost:${PORT}/api/services`);
  
  await connectDB();
  
  console.log('');
  console.log('🎉 AutoCure AI Platform is ready for demo!');
  console.log('📱 Frontend will run on: http://localhost:3000');
  console.log('🔧 Backend API running on: http://localhost:5000');
});

module.exports = app;