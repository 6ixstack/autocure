const { OpenAIApi } = require('@azure/openai');
const { DefaultAzureCredential } = require('@azure/identity');

class AzureOpenAIService {
  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    this.apiKey = process.env.AZURE_OPENAI_API_KEY;
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    
    if (!this.endpoint || !this.apiKey || !this.deploymentName) {
      console.warn('⚠️  Azure OpenAI credentials not configured. AI features will use mock responses.');
      this.useMockMode = true;
      return;
    }

    try {
      this.client = new OpenAIApi(
        this.endpoint,
        this.apiKey ? { key: this.apiKey } : new DefaultAzureCredential()
      );
      this.useMockMode = false;
      console.log('✅ Azure OpenAI client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI client:', error.message);
      this.useMockMode = true;
    }
  }

  async generateChatResponse(messages, context = {}) {
    if (this.useMockMode) {
      return this.getMockResponse(messages, context);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const response = await this.client.getChatCompletions(
        this.deploymentName,
        fullMessages,
        {
          maxTokens: 800,
          temperature: 0.7,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0
        }
      );

      return response.choices[0]?.message?.content || 'I apologize, I could not generate a response at this time.';
    } catch (error) {
      console.error('Azure OpenAI API error:', error);
      return this.getErrorResponse();
    }
  }

  buildSystemPrompt(context) {
    const shopInfo = {
      name: process.env.SHOP_NAME || 'AutoCure',
      address: process.env.SHOP_ADDRESS || '123 Main St, Brampton, ON L6T 4M5',
      phone: process.env.SHOP_PHONE || '+1-905-123-4567',
      email: process.env.SHOP_EMAIL || 'info@autocure.net',
      website: process.env.SHOP_WEBSITE || 'https://autocure.net'
    };

    return `You are an AI assistant for ${shopInfo.name}, a professional European auto repair shop specializing in BMW, Mercedes-Benz, Audi, Volkswagen, and Porsche vehicles.

SHOP INFORMATION:
- Name: ${shopInfo.name}
- Address: ${shopInfo.address}
- Phone: ${shopInfo.phone}
- Email: ${shopInfo.email}
- Website: ${shopInfo.website}
- Hours: Monday-Friday 8:00 AM - 6:00 PM, Saturday 9:00 AM - 4:00 PM, Closed Sunday
- Specialization: European vehicles (20+ years experience)

SERVICES WE OFFER:
- Oil changes and routine maintenance
- Brake service and repair
- Engine diagnostics and repair
- Transmission service
- Electrical system diagnostics
- Battery replacement
- Cooling system service
- Exhaust system repair
- Suspension and steering
- Air conditioning service
- Pre-purchase inspections
- Emergency repairs

PRICING EXAMPLES:
- Oil change: $80-120 (depending on vehicle)
- Brake pad replacement: $200-400
- Engine diagnostics: $150-200
- Battery replacement: $180-250

YOUR ROLE:
- Help customers with inquiries about services, pricing, and scheduling
- Provide accurate information about repair processes
- Assist with appointment booking and rescheduling
- Explain diagnostic codes and repair recommendations
- Maintain a professional, helpful, and knowledgeable tone
- Always prioritize safety and quality in your recommendations

GUIDELINES:
- Be concise but informative
- Ask clarifying questions when needed
- Escalate complex technical issues to human staff
- Always confirm appointment details
- Provide realistic timeframes and pricing estimates
- Emphasize our expertise with European vehicles

${context.customerInfo ? `CUSTOMER CONTEXT: ${JSON.stringify(context.customerInfo)}` : ''}
${context.vehicleInfo ? `VEHICLE CONTEXT: ${JSON.stringify(context.vehicleInfo)}` : ''}
${context.appointmentInfo ? `APPOINTMENT CONTEXT: ${JSON.stringify(context.appointmentInfo)}` : ''}`;
  }

  getMockResponse(messages, context) {
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    
    // Mock responses based on common queries
    if (lastMessage.includes('hours') || lastMessage.includes('open')) {
      return "Our hours are Monday-Friday 8:00 AM - 6:00 PM, Saturday 9:00 AM - 4:00 PM. We're closed on Sundays. Is there anything specific you'd like to schedule?";
    }
    
    if (lastMessage.includes('price') || lastMessage.includes('cost') || lastMessage.includes('quote')) {
      return "I'd be happy to provide pricing information! For example, oil changes range from $80-120 depending on your vehicle. Could you tell me your vehicle make and model for a more accurate estimate?";
    }
    
    if (lastMessage.includes('appointment') || lastMessage.includes('book') || lastMessage.includes('schedule')) {
      return "I can help you schedule an appointment! We have availability this week. What type of service do you need, and what's your preferred date and time?";
    }
    
    if (lastMessage.includes('location') || lastMessage.includes('address') || lastMessage.includes('directions')) {
      return "We're located at 123 Main St, Brampton, ON L6T 4M5. You can easily find us near the intersection of Main Street and First Avenue. Is there anything else I can help you with?";
    }
    
    if (lastMessage.includes('diagnostic') || lastMessage.includes('check engine') || lastMessage.includes('error code')) {
      return "Our diagnostic service costs $150-200 and includes a comprehensive scan of your vehicle's systems. We use professional Autel diagnostic equipment to identify issues accurately. Would you like to schedule a diagnostic appointment?";
    }
    
    return "Thank you for contacting AutoCure! I'm here to help with any questions about our services, scheduling appointments, or providing information about your vehicle. How can I assist you today?";
  }

  getErrorResponse() {
    return "I'm experiencing some technical difficulties right now. Please feel free to call us at +1-905-123-4567 or visit our website for immediate assistance. How else can I help you today?";
  }

  async generateDiagnosticExplanation(diagnosticCode, vehicleInfo = {}) {
    if (this.useMockMode) {
      return this.getMockDiagnosticExplanation(diagnosticCode);
    }

    const prompt = `Explain diagnostic code ${diagnosticCode} for a ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}. 
    Provide:
    1. What the code means in simple terms
    2. Possible symptoms the customer might notice
    3. Potential causes
    4. Estimated repair cost range
    5. Urgency level (low/medium/high/critical)
    
    Keep it customer-friendly but informative.`;

    try {
      const response = await this.generateChatResponse([
        { role: 'user', content: prompt }
      ], { vehicleInfo });
      
      return response;
    } catch (error) {
      return this.getMockDiagnosticExplanation(diagnosticCode);
    }
  }

  getMockDiagnosticExplanation(code) {
    const mockExplanations = {
      'P0300': {
        title: 'Random/Multiple Cylinder Misfire Detected',
        description: 'Your engine is misfiring, which means one or more cylinders are not firing properly.',
        symptoms: ['Rough idle', 'Loss of power', 'Poor fuel economy', 'Engine vibration'],
        causes: ['Faulty spark plugs', 'Ignition coils', 'Fuel system issues', 'Vacuum leaks'],
        urgency: 'medium',
        estimatedCost: '$200-800'
      },
      'P0171': {
        title: 'System Too Lean (Bank 1)',
        description: 'Your engine is running lean, meaning there\'s too much air or not enough fuel in the mixture.',
        symptoms: ['Poor acceleration', 'Rough idle', 'Check engine light'],
        causes: ['Vacuum leak', 'Faulty oxygen sensor', 'Fuel pump issues', 'Dirty air filter'],
        urgency: 'medium',
        estimatedCost: '$150-500'
      }
    };

    const explanation = mockExplanations[code] || {
      title: 'Diagnostic Code Detected',
      description: 'A diagnostic trouble code has been detected in your vehicle\'s system.',
      symptoms: ['Various symptoms possible'],
      causes: ['Multiple potential causes'],
      urgency: 'medium',
      estimatedCost: '$100-400'
    };

    return `**${explanation.title}**

${explanation.description}

**Symptoms you might notice:**
${explanation.symptoms.map(s => `• ${s}`).join('\n')}

**Possible causes:**
${explanation.causes.map(c => `• ${c}`).join('\n')}

**Urgency:** ${explanation.urgency.toUpperCase()}
**Estimated repair cost:** ${explanation.estimatedCost}

I recommend scheduling a diagnostic appointment so our technicians can provide a precise diagnosis and repair estimate for your specific vehicle.`;
  }
}

module.exports = new AzureOpenAIService();