# 🚗 AutoCure AI Platform

<div align="center">

![AutoCure AI Platform](https://img.shields.io/badge/AutoCure-AI%20Platform-1976d2?style=for-the-badge&logo=car&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Azure](https://img.shields.io/badge/Microsoft_Azure-0089D0?style=for-the-badge&logo=microsoft-azure&logoColor=white)

**AI-Powered European Auto Repair Management System**

*🤖 Intelligent Customer Service • 🔧 Diagnostic Integration • 📱 Real-time Updates*

[🌐 **Live Demo**](https://your-username.github.io/autocure/) | [📖 **Documentation**](#documentation) | [🚀 **Quick Start**](#quick-start) | [🎯 **Features**](#features)

</div>

---

## 🌟 Overview

AutoCure AI Platform is a cutting-edge auto shop management system designed specifically for European vehicle specialists. Featuring AI-powered customer service, real-time diagnostics, and comprehensive shop management tools.

### 🎯 **Perfect For:**
- 🚗 European Auto Repair Shops (BMW, Mercedes, Audi, VW, Porsche)
- 🤖 Businesses wanting AI-powered customer service
- 📊 Shops needing modern management tools
- 🔧 Integration with diagnostic equipment (Autel OBD)

---

## ✨ Features

### 🤖 **AI-Powered Customer Service**
- **24/7 Azure OpenAI Integration** - Intelligent chat assistant
- **Context-Aware Responses** - Understands automotive terminology
- **Multi-language Support** - Professional communication
- **Escalation System** - Seamless handoff to human staff

### 🔧 **Diagnostic Integration**
- **Autel OBD Simulation** - Realistic diagnostic workflows
- **Visual Code Explanations** - Customer-friendly explanations
- **Professional Reports** - Branded diagnostic reports
- **Real-time Updates** - Live status notifications

### 📱 **Modern Interface**
- **Responsive Design** - Mobile-first approach
- **Material-UI Components** - Professional appearance
- **Real-time Chat** - Instant messaging with WebSocket
- **Progressive Web App** - App-like experience

### 🏢 **Shop Management**
- **Appointment Scheduling** - Online booking system
- **Customer Portal** - Self-service capabilities
- **Staff Dashboard** - Comprehensive analytics
- **Digital Invoicing** - Automated billing system

### 🔒 **Enterprise Security**
- **JWT Authentication** - Secure token-based auth
- **Role-based Access** - Customer/Staff/Admin roles
- **Data Encryption** - Protected customer information
- **GDPR Compliant** - Privacy-first design

---

## 🚀 Quick Start

### 📋 Prerequisites
- **Node.js 18+** - [Download](https://nodejs.org/)
- **MongoDB Atlas Account** - [Free Tier](https://www.mongodb.com/cloud/atlas)
- **Azure OpenAI Access** - [Apply Here](https://azure.microsoft.com/en-us/products/ai-services/openai-service)

### ⚡ Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/autocure.git
cd autocure

# 2. Install all dependencies
npm run install-all

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see Configuration section)

# 4. Start development servers
npm run dev

# 5. Open your browser
# Frontend: http://localhost:3000
# Backend: http://localhost:5001
```

### 🌐 **Live Demo Access**
Visit our **[Live Demo](https://your-username.github.io/autocure/)** to try the platform instantly!

---

## ⚙️ Configuration

### 🔐 Environment Variables

Create `.env` file in the root directory with your credentials:

```bash
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/autocure

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name

# JWT Security
JWT_SECRET=your-super-secret-jwt-key

# Server Configuration
PORT=5001
NODE_ENV=development
```

### 📊 **MongoDB Atlas Setup**

1. Create a [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
2. Create a new cluster (free tier available)
3. Add database user with read/write permissions
4. Whitelist your IP address (or use 0.0.0.0/0 for demo)
5. Get connection string and update `MONGODB_URI`

### 🧠 **Azure OpenAI Setup**

1. Apply for [Azure OpenAI Service](https://azure.microsoft.com/en-us/products/ai-services/openai-service) access
2. Create an OpenAI resource in Azure Portal
3. Deploy a GPT model (recommended: GPT-3.5-turbo or GPT-4)
4. Get endpoint URL, API key, and deployment name
5. Update environment variables

---

## 🏗️ Architecture

### 📁 Project Structure
```
autocure/
├── 📱 client/              # React TypeScript Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── services/      # API integration
│   │   └── contexts/      # React context providers
│   └── public/            # Static assets
├── 🖥️ server/             # Node.js TypeScript Backend
│   ├── src/
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── middleware/    # Express middleware
│   └── simple-server.js   # Demo server
├── 🚀 .github/            # GitHub Actions
└── 📝 docs/               # Documentation
```

### 🔄 Technology Stack

**Frontend:**
- ⚛️ **React 18** with TypeScript
- 🎨 **Material-UI** for components
- 🔌 **Socket.io** for real-time updates
- 📱 **Progressive Web App** capabilities

**Backend:**
- 🟢 **Node.js** with Express.js
- 📘 **TypeScript** for type safety
- 🍃 **MongoDB** with Mongoose ODM
- 🤖 **Azure OpenAI** integration
- 🔐 **JWT** authentication

**Infrastructure:**
- ☁️ **MongoDB Atlas** cloud database
- 🌐 **GitHub Pages** static hosting
- 🚀 **Render/Vercel** API hosting
- 📊 **GitHub Actions** CI/CD

---

## 📚 API Documentation

### 🔗 Core Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/health` | GET | System health check |
| `/api/ai/chat` | POST | AI chat interaction |
| `/api/auth/login` | POST | User authentication |
| `/api/services` | GET | Available services |
| `/api/appointments` | GET/POST | Appointment management |
| `/api/diagnostics/scan/:vehicleId` | POST | Diagnostic scanning |

### 💬 AI Chat API

```bash
# Example: Chat with AI Assistant
curl -X POST http://localhost:5001/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are your hours?"}'

# Response
{
  "success": true,
  "data": {
    "message": {
      "message": "We're open Monday-Friday 8:00 AM - 6:00 PM...",
      "sender": "ai",
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

---

## 🎮 Demo Features

### 🤖 **Try the AI Assistant**

Ask these questions in the chat:

```
💬 "What are your hours?"
💬 "How much for BMW brake service?"
💬 "Book an appointment for Mercedes oil change"
💬 "Do you work on Audi vehicles?"
💬 "I need engine diagnostics"
💬 "What's included in your brake service?"
```

### 🚗 **Vehicle Specialization**

Our AI understands:
- **BMW** - 3 Series, 5 Series, X3, X5, etc.
- **Mercedes-Benz** - C-Class, E-Class, GLC, etc.
- **Audi** - A4, A6, Q5, Q7, etc.
- **Volkswagen** - Golf, Passat, Tiguan, etc.
- **Porsche** - 911, Cayenne, Macan, etc.

### 🔧 **Service Categories**

- 🛢️ **Oil Changes** ($89-120)
- 🛑 **Brake Service** ($200-400)
- 🔍 **Engine Diagnostics** ($150-200)
- ⚙️ **Transmission Service** ($300-800)
- 🔋 **Battery Replacement** ($180-250)
- ❄️ **A/C Service** ($200-500)

---

## 🚀 Deployment

### 🌐 GitHub Pages (Frontend)

```bash
# Build and deploy frontend
cd client
npm run build
npm run deploy
```

**Automatic deployment via GitHub Actions when you push to main branch.**

### ☁️ Backend Hosting Options

**Option 1: Render (Recommended)**
1. Connect GitHub repository to [Render](https://render.com)
2. Set environment variables in Render dashboard
3. Deploy with one click

**Option 2: Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy backend
cd server
vercel --prod
```

**Option 3: Railway**
1. Connect repository to [Railway](https://railway.app)
2. Configure environment variables
3. Deploy automatically

### 🐳 Docker Deployment

```bash
# Build and run with Docker
docker-compose up --build

# Production deployment
docker-compose -f docker-compose.prod.yml up
```

---

## 🧪 Testing

### 🔧 Backend Tests
```bash
cd server
npm test                    # Run test suite
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### ⚛️ Frontend Tests
```bash
cd client
npm test                    # Run test suite
npm run test:coverage      # Coverage report
```

### 🌐 End-to-End Tests
```bash
npm run test:e2e           # Full system testing
```

---

## 📊 Monitoring & Analytics

### 🔍 Built-in Analytics
- 📈 **Appointment Trends** - Daily/weekly/monthly
- 💰 **Revenue Tracking** - Service profitability
- 👥 **Customer Metrics** - Retention and growth
- 🤖 **AI Performance** - Response quality

### 📱 Health Monitoring
- ⚡ **API Response Times** - Performance tracking
- 🌐 **Uptime Monitoring** - Service availability
- 🗄️ **Database Health** - Connection status
- 🧠 **AI Service Status** - Azure OpenAI connectivity

---

## 🔒 Security

### 🛡️ Security Features
- 🔐 **JWT Authentication** with refresh tokens
- 🚦 **Rate Limiting** on all endpoints
- ✅ **Input Validation** and sanitization
- 🌐 **CORS Protection** for cross-origin requests
- 🛠️ **Helmet.js** security headers
- 🔒 **bcrypt** password hashing

### 🎯 Best Practices
- Environment variables for secrets
- SQL injection prevention
- XSS attack protection
- CSRF token implementation
- Regular security audits

---

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### 🔄 Development Workflow

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### 🐛 Bug Reports

Please use our [Issue Template](.github/ISSUE_TEMPLATE/bug_report.md) for bug reports.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

### 📞 Get Help

- 📧 **Email**: dev@autocure.net
- 💬 **Discord**: [Join our community](https://discord.gg/autocure)
- 📖 **Documentation**: [Full API docs](https://docs.autocure.net)
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-username/autocure/issues)

### 🎓 Resources

- [Azure OpenAI Documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com/)
- [React TypeScript Guide](https://react-typescript-cheatsheet.netlify.app/)
- [Material-UI Documentation](https://mui.com/)

---

## 🎉 Acknowledgments

- 🤖 **Azure OpenAI** for powering our AI assistant
- 🍃 **MongoDB Atlas** for reliable cloud database
- ⚛️ **React Team** for the amazing framework
- 🎨 **Material-UI** for beautiful components
- 🚗 **AutoCure Team** for domain expertise

---

<div align="center">

**🌟 Star this repository if you found it helpful! 🌟**

**Made with ❤️ by the AutoCure AI Team**

[⬆ Back to Top](#-autocure-ai-platform)

</div>