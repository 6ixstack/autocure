import OpenAI from 'openai';
import { IUser, IVehicle, IAppointment, IDiagnosticCode } from '@/types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  customerInfo?: Partial<IUser>;
  vehicleInfo?: Partial<IVehicle>;
  appointmentInfo?: Partial<IAppointment>;
}

interface DiagnosticExplanation {
  title: string;
  description: string;
  symptoms: string[];
  causes: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: string;
  category: string;
  recommendations: string[];
}

class AzureOpenAIService {
  private client: OpenAI | null = null;
  private useMockMode: boolean = false;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly deploymentName: string;

  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT || '';
    this.apiKey = process.env.AZURE_OPENAI_API_KEY || '';
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '';
    
    if (!this.endpoint || !this.apiKey || !this.deploymentName) {
      console.warn('⚠️  Azure OpenAI credentials not configured. AI features will use mock responses.');
      this.useMockMode = true;
      return;
    }

    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    try {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: `${this.endpoint}/openai/deployments/${this.deploymentName}`,
        defaultQuery: { 'api-version': '2024-02-01' },
        defaultHeaders: {
          'api-key': this.apiKey,
        },
      });
      this.useMockMode = false;
      console.log('✅ Azure OpenAI client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Azure OpenAI client:', error);
      this.useMockMode = true;
    }
  }

  async generateChatResponse(messages: ChatMessage[], context: ChatContext = {}): Promise<string> {
    if (this.useMockMode) {
      return this.getMockResponse(messages, context);
    }

    try {
      if (!this.client) {
        throw new Error('Azure OpenAI client not initialized');
      }

      const systemPrompt = this.buildSystemPrompt(context);
      const fullMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];

      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: fullMessages,
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      });

      const content = response.choices[0]?.message?.content;
      return content || 'I apologize, I could not generate a response at this time.';
    } catch (error) {
      console.error('Azure OpenAI API error:', error);
      return this.getErrorResponse();
    }
  }

  private buildSystemPrompt(context: ChatContext): string {
    const shopInfo = {
      name: process.env.SHOP_NAME || 'AutoCure',
      address: process.env.SHOP_ADDRESS || '123 Main St, Brampton, ON L6T 4M5',
      phone: process.env.SHOP_PHONE || '+1-905-123-4567',
      email: process.env.SHOP_EMAIL || 'info@autocure.net',
      website: process.env.SHOP_WEBSITE || 'https://autocure.net'
    };

    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const isOpen = (currentTime.getDay() >= 1 && currentTime.getDay() <= 5 && currentHour >= 8 && currentHour < 18) ||
                   (currentTime.getDay() === 6 && currentHour >= 9 && currentHour < 16);

    return `You are an AI assistant for ${shopInfo.name}, a professional European auto repair shop specializing in BMW, Mercedes-Benz, Audi, Volkswagen, and Porsche vehicles in Brampton, Ontario.

SHOP INFORMATION:
- Name: ${shopInfo.name}
- Address: ${shopInfo.address}
- Phone: ${shopInfo.phone}
- Email: ${shopInfo.email}
- Website: ${shopInfo.website}
- Hours: Monday-Friday 8:00 AM - 6:00 PM, Saturday 9:00 AM - 4:00 PM, Closed Sunday
- Current Status: ${isOpen ? 'OPEN' : 'CLOSED'}
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

YOUR ROLE AND CAPABILITIES:
- Help customers with inquiries about services, pricing, and scheduling
- Provide accurate information about repair processes and timeframes
- Assist with appointment booking, rescheduling, and cancellations
- Explain diagnostic codes and repair recommendations in simple terms
- Escalate complex technical issues or emergencies to human staff
- Maintain a professional, helpful, and knowledgeable tone
- Always prioritize safety and quality in recommendations

GUIDELINES:
- Be concise but informative (2-3 sentences preferred)
- Ask clarifying questions when needed to provide better assistance
- Provide realistic timeframes and pricing estimates
- Emphasize our expertise with European vehicles
- For appointments, check availability and confirm details
- For urgent issues, recommend immediate attention
- Always offer to connect with human staff for complex matters

CONTEXT INFORMATION:
${context.customerInfo ? `Customer: ${context.customerInfo.firstName} ${context.customerInfo.lastName} (${context.customerInfo.email})` : ''}
${context.vehicleInfo ? `Vehicle: ${context.vehicleInfo.year} ${context.vehicleInfo.make} ${context.vehicleInfo.model} (VIN: ${context.vehicleInfo.vin})` : ''}
${context.appointmentInfo ? `Appointment: ${context.appointmentInfo.status} for ${context.appointmentInfo.appointmentDate}` : ''}

Remember: You represent AutoCure's commitment to quality European auto repair. Be helpful, professional, and accurate in all responses.`;
  }

  private getMockResponse(messages: ChatMessage[], context: ChatContext): string {
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    
    // Context-aware responses
    if (context.customerInfo) {
      const firstName = context.customerInfo.firstName || 'there';
      
      if (lastMessage.includes('appointment') && context.appointmentInfo) {
        return `Hi ${firstName}! I can see your ${context.appointmentInfo.status} appointment. How can I help you with it today?`;
      }
      
      if (context.vehicleInfo) {
        const vehicle = `${context.vehicleInfo.year} ${context.vehicleInfo.make} ${context.vehicleInfo.model}`;
        if (lastMessage.includes('service') || lastMessage.includes('maintenance')) {
          return `Hello ${firstName}! For your ${vehicle}, I'd recommend our comprehensive maintenance package. Would you like to schedule a service appointment?`;
        }
      }
    }
    
    // Standard mock responses based on query type
    if (lastMessage.includes('hours') || lastMessage.includes('open')) {
      return "We're open Monday-Friday 8:00 AM - 6:00 PM, Saturday 9:00 AM - 4:00 PM, and closed Sundays. Is there a specific service you'd like to schedule?";
    }
    
    if (lastMessage.includes('price') || lastMessage.includes('cost') || lastMessage.includes('quote')) {
      return "I'd be happy to provide pricing! For example, oil changes range from $80-120 depending on your European vehicle. Could you tell me your vehicle make and model for a more accurate estimate?";
    }
    
    if (lastMessage.includes('appointment') || lastMessage.includes('book') || lastMessage.includes('schedule')) {
      return "I can help you schedule an appointment! We have availability this week. What type of service do you need, and what's your preferred date and time?";
    }
    
    if (lastMessage.includes('location') || lastMessage.includes('address') || lastMessage.includes('directions')) {
      return "We're located at 123 Main St, Brampton, ON L6T 4M5, specializing in European vehicles. Easy parking available. What brings your vehicle in today?";
    }
    
    if (lastMessage.includes('diagnostic') || lastMessage.includes('check engine') || lastMessage.includes('error code')) {
      return "Our diagnostic service costs $150-200 and uses professional Autel equipment for accurate results. We can explain any codes found and provide repair recommendations. Would you like to schedule a diagnostic?";
    }

    if (lastMessage.includes('bmw') || lastMessage.includes('mercedes') || lastMessage.includes('audi') || lastMessage.includes('volkswagen') || lastMessage.includes('porsche')) {
      return "Excellent! We specialize in European vehicles with over 20 years of experience. Our technicians are trained specifically for your vehicle's needs. What service can we help you with?";
    }
    
    return "Welcome to AutoCure! I'm here to help with scheduling, service information, pricing, or any questions about your European vehicle. How can I assist you today?";
  }

  private getErrorResponse(): string {
    return "I'm experiencing some technical difficulties right now. Please call us at +1-905-123-4567 or visit our website for immediate assistance. How else can I help you today?";
  }

  async generateDiagnosticExplanation(diagnosticCode: string, vehicleInfo: Partial<IVehicle> = {}): Promise<DiagnosticExplanation> {
    if (this.useMockMode) {
      return this.getMockDiagnosticExplanation(diagnosticCode, vehicleInfo);
    }

    const vehicleDescription = vehicleInfo.year && vehicleInfo.make && vehicleInfo.model 
      ? `${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`
      : 'the vehicle';

    const prompt = `Explain diagnostic trouble code ${diagnosticCode} for ${vehicleDescription}. 
    Provide a comprehensive but customer-friendly explanation including:
    1. Clear title and description of what the code means
    2. Symptoms the customer might notice
    3. Most common causes
    4. Urgency level (low/medium/high/critical)
    5. Estimated repair cost range in CAD
    6. Category/system affected
    7. Immediate recommendations
    
    Format as JSON with fields: title, description, symptoms[], causes[], urgency, estimatedCost, category, recommendations[]`;

    try {
      const response = await this.generateChatResponse([
        { role: 'user', content: prompt }
      ], { vehicleInfo });
      
      // Try to parse JSON response, fallback to text parsing if needed
      try {
        return JSON.parse(response);
      } catch {
        return this.parseTextResponse(response, diagnosticCode);
      }
    } catch (error) {
      console.error('Error generating diagnostic explanation:', error);
      return this.getMockDiagnosticExplanation(diagnosticCode, vehicleInfo);
    }
  }

  private parseTextResponse(response: string, code: string): DiagnosticExplanation {
    // Simple text parsing fallback
    const lines = response.split('\n').filter(line => line.trim());
    
    return {
      title: lines[0] || `Diagnostic Code ${code}`,
      description: lines[1] || 'A diagnostic trouble code has been detected.',
      symptoms: lines.filter(line => line.includes('symptom')).slice(0, 3),
      causes: lines.filter(line => line.includes('cause')).slice(0, 3),
      urgency: 'medium',
      estimatedCost: '$200-600',
      category: 'Engine/Emission',
      recommendations: ['Professional diagnostic scan', 'Repair as needed']
    };
  }

  private getMockDiagnosticExplanation(code: string, vehicleInfo: Partial<IVehicle> = {}): DiagnosticExplanation {
    const mockExplanations: Record<string, DiagnosticExplanation> = {
      'P0300': {
        title: 'Random/Multiple Cylinder Misfire Detected',
        description: 'Your engine is misfiring, meaning one or more cylinders are not firing properly. This affects engine performance and can cause damage if not addressed.',
        symptoms: ['Rough idle or engine shaking', 'Loss of power during acceleration', 'Poor fuel economy', 'Engine hesitation', 'Check engine light'],
        causes: ['Worn spark plugs or ignition coils', 'Fuel system problems', 'Vacuum leaks', 'Carbon buildup', 'Compression issues'],
        urgency: 'high',
        estimatedCost: '$300-1200',
        category: 'Engine/Ignition System',
        recommendations: ['Stop driving if severely misfiring', 'Schedule diagnostic immediately', 'Check for pending codes']
      },
      'P0171': {
        title: 'System Too Lean (Bank 1)',
        description: 'Your engine is running lean, meaning there\'s too much air or not enough fuel in the combustion mixture.',
        symptoms: ['Poor acceleration', 'Rough idle', 'Engine hesitation', 'Check engine light', 'Possible stalling'],
        causes: ['Vacuum leak in intake system', 'Faulty oxygen sensor', 'Dirty or failing mass airflow sensor', 'Fuel pump issues', 'Clogged fuel injectors'],
        urgency: 'medium',
        estimatedCost: '$200-800',
        category: 'Fuel/Air System',
        recommendations: ['Monitor fuel economy', 'Schedule diagnostic within a week', 'Check for vacuum leaks']
      },
      'P0420': {
        title: 'Catalyst System Efficiency Below Threshold (Bank 1)',
        description: 'Your catalytic converter is not working efficiently, which affects emissions and can lead to failed emissions tests.',
        symptoms: ['Check engine light', 'Reduced fuel economy', 'Possible sulfur smell', 'Failed emissions test'],
        causes: ['Worn catalytic converter', 'Faulty oxygen sensors', 'Engine misfires damaging catalyst', 'Contaminated catalyst'],
        urgency: 'medium',
        estimatedCost: '$800-2500',
        category: 'Emission Control System',
        recommendations: ['Schedule diagnostic soon', 'May affect emissions test', 'Address any engine misfires first']
      },
      'P0455': {
        title: 'Evaporative Emission Control System Leak Detected (Large Leak)',
        description: 'There\'s a large leak in your vehicle\'s evaporative emission system, which captures fuel vapors.',
        symptoms: ['Check engine light', 'Fuel smell', 'Possible fuel economy decrease'],
        causes: ['Loose or damaged gas cap', 'Cracked EVAP lines', 'Faulty purge valve', 'Damaged fuel tank'],
        urgency: 'low',
        estimatedCost: '$50-400',
        category: 'Emission Control System',
        recommendations: ['Check gas cap first', 'Safe to drive', 'Schedule service when convenient']
      }
    };

    const explanation = mockExplanations[code] || {
      title: `Diagnostic Code ${code}`,
      description: 'A diagnostic trouble code has been detected in your vehicle\'s system. Professional diagnosis is recommended to determine the exact cause.',
      symptoms: ['Check engine light', 'Possible performance issues', 'Various symptoms possible'],
      causes: ['Multiple potential causes', 'Requires diagnostic scan'],
      urgency: 'medium',
      estimatedCost: '$150-600',
      category: 'Vehicle System',
      recommendations: ['Schedule diagnostic appointment', 'Professional scan needed']
    };

    // Adjust pricing for luxury vehicles
    if (vehicleInfo.make && ['BMW', 'Mercedes-Benz', 'Audi', 'Porsche'].includes(vehicleInfo.make)) {
      const [minStr, maxStr] = explanation.estimatedCost.replace('$', '').split('-');
      const min = parseInt(minStr || '200');
      const max = parseInt(maxStr || '600');
      explanation.estimatedCost = `$${Math.round(min * 1.3)}-${Math.round(max * 1.5)}`;
    }

    return explanation;
  }

  async generateServiceRecommendations(vehicleInfo: IVehicle, symptoms: string[] = []): Promise<string[]> {
    if (this.useMockMode) {
      return this.getMockServiceRecommendations(vehicleInfo, symptoms);
    }

    const prompt = `Based on this vehicle information and symptoms, recommend appropriate services:
    Vehicle: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}
    Mileage: ${vehicleInfo.mileage || 'Unknown'}
    Last Service: ${vehicleInfo.lastServiceDate || 'Unknown'}
    Symptoms: ${symptoms.join(', ') || 'None specified'}
    
    Provide 3-5 specific service recommendations with brief explanations.`;

    try {
      const response = await this.generateChatResponse([
        { role: 'user', content: prompt }
      ], { vehicleInfo });
      
      return response.split('\n').filter(line => line.trim()).slice(0, 5);
    } catch (error) {
      return this.getMockServiceRecommendations(vehicleInfo, symptoms);
    }
  }

  private getMockServiceRecommendations(vehicleInfo: IVehicle, symptoms: string[]): string[] {
    const recommendations: string[] = [];
    const mileage = vehicleInfo.mileage || 0;
    const lastService = vehicleInfo.lastServiceDate;
    const monthsSinceService = lastService ? 
      Math.floor((Date.now() - lastService.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 12;

    // Basic maintenance recommendations
    if (!lastService || monthsSinceService >= 6) {
      recommendations.push('Oil and filter change - Essential for engine health');
    }

    if (mileage > 50000) {
      recommendations.push('Brake inspection - Important safety check for higher mileage vehicles');
    }

    if (monthsSinceService >= 12) {
      recommendations.push('Comprehensive vehicle inspection - Annual check-up recommended');
    }

    // Symptom-based recommendations
    if (symptoms.some(s => s.toLowerCase().includes('noise'))) {
      recommendations.push('Diagnostic inspection - Identify source of unusual noises');
    }

    if (symptoms.some(s => s.toLowerCase().includes('vibration'))) {
      recommendations.push('Wheel balance and alignment check - Address vibration issues');
    }

    // European vehicle specific
    if (['BMW', 'Mercedes-Benz', 'Audi'].includes(vehicleInfo.make)) {
      recommendations.push('European vehicle diagnostic scan - Specialized check for your vehicle');
    }

    return recommendations.slice(0, 5);
  }

  isConfigured(): boolean {
    return !this.useMockMode && this.client !== null;
  }

  getStatus(): { configured: boolean; mode: string } {
    return {
      configured: !this.useMockMode,
      mode: this.useMockMode ? 'mock' : 'azure'
    };
  }
}

export default new AzureOpenAIService();