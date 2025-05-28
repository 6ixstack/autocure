import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as PersonIcon,
  Build as ServiceIcon,
  Schedule as TimeIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { aiAPI } from '../services/api';

interface Message {
  id: string;
  message: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const HomePage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      message: 'Welcome to AutoCure! I\'m your AI assistant ready to help with your European vehicle needs. How can I assist you today?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      message: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await aiAPI.chat({
        message: inputMessage
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        message: (response.data as any)?.data?.message?.message || (response.data as any)?.message || 'Sorry, I encountered an error.',
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        message: 'I apologize, but I\'m having trouble connecting right now. Please call us at +1-905-123-4567 for immediate assistance.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const quickQuestions = [
    'What are your hours?',
    'How much for an oil change?',
    'Book an appointment',
    'BMW service pricing',
    'Engine diagnostics cost'
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <img 
              src="/logo.svg" 
              alt="AutoCure AI Platform" 
              style={{ 
                width: '80px', 
                height: '80px', 
                marginRight: '16px',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              }} 
            />
            <Box>
              <Typography variant="h2" color="white" fontWeight="bold" sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                AutoCure AI
              </Typography>
              <Typography variant="h6" color="white" sx={{ opacity: 0.9, fontWeight: 300 }}>
                European Auto Specialists
              </Typography>
            </Box>
          </Box>
          <Typography variant="h5" color="white" sx={{ opacity: 0.9, textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            🤖 AI-Powered • 🔧 Professional Diagnostics • 🚗 European Vehicle Experts
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* Chat Interface */}
          <Grid item xs={12} md={8}>
            <Paper elevation={8} sx={{ borderRadius: 3, overflow: 'hidden' }}>
              {/* Chat Header */}
              <Box sx={{ 
                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                color: 'white',
                p: 3,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                  opacity: 0.1
                }}/>
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                  <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    🤖 AI Assistant Chat
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                    Get instant help with services, pricing, and appointments
                  </Typography>
                </Box>
              </Box>

              {/* Messages */}
              <Box sx={{ 
                height: 400, 
                overflowY: 'auto', 
                p: 2,
                background: '#f8f9fa'
              }}>
                {messages.map((msg) => (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                      gap: 1,
                      maxWidth: '80%'
                    }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: msg.sender === 'user' ? '#4caf50' : '#1976d2',
                          width: 32,
                          height: 32
                        }}
                      >
                        {msg.sender === 'user' ? <PersonIcon /> : <BotIcon />}
                      </Avatar>
                      
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          bgcolor: msg.sender === 'user' ? '#e3f2fd' : 'white',
                          borderRadius: 2,
                          border: msg.sender === 'ai' ? '1px solid #e0e0e0' : 'none'
                        }}
                      >
                        <Typography variant="body1">
                          {msg.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {msg.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Paper>
                    </Box>
                  </Box>
                ))}
                
                {isLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32 }}>
                        <BotIcon />
                      </Avatar>
                      <Paper elevation={2} sx={{ p: 2, borderRadius: 2 }}>
                        <CircularProgress size={20} />
                        <Typography variant="body2" sx={{ ml: 1, display: 'inline' }}>
                          Thinking...
                        </Typography>
                      </Paper>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Quick Questions */}
              <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Quick questions:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {quickQuestions.map((question, index) => (
                    <Chip
                      key={index}
                      label={question}
                      onClick={() => setInputMessage(question)}
                      clickable
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ))}
                </Box>
              </Box>

              {/* Input */}
              <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', background: 'white' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={3}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about services, pricing, appointments..."
                    disabled={isLoading}
                    variant="outlined"
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    sx={{ minWidth: 'auto', px: 2 }}
                  >
                    <SendIcon />
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Info Panel */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2}>
              {/* Shop Info */}
              <Grid item xs={12}>
                <Card elevation={6} sx={{ 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  border: '1px solid #e3f2fd'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontWeight: 600,
                      mb: 2
                    }}>
                      <LocationIcon sx={{ mr: 1, fontSize: 28, color: '#1976d2' }} />
                      AutoCure Location
                    </Typography>
                    <Box sx={{ pl: 4 }}>
                      <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        🏢 123 Main St, Brampton, ON L6T 4M5
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        📞 +1-905-123-4567
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                        ✉️ info@autocure.net
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Hours */}
              <Grid item xs={12}>
                <Card elevation={6} sx={{ 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  border: '1px solid #e3f2fd'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontWeight: 600,
                      mb: 2
                    }}>
                      <TimeIcon sx={{ mr: 1, fontSize: 28, color: '#1976d2' }} />
                      Business Hours
                    </Typography>
                    <Box sx={{ pl: 4 }}>
                      <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        🕘 Monday - Friday: 8:00 AM - 6:00 PM
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        🕘 Saturday: 9:00 AM - 4:00 PM
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', color: '#d32f2f' }}>
                        🔒 Sunday: Closed
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Services */}
              <Grid item xs={12}>
                <Card elevation={6} sx={{ 
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  border: '1px solid #e3f2fd'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom color="primary" sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      fontWeight: 600,
                      mb: 2
                    }}>
                      <ServiceIcon sx={{ mr: 1, fontSize: 28, color: '#1976d2' }} />
                      Popular Services
                    </Typography>
                    <Box sx={{ pl: 4 }}>
                      <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        🛢️ Oil Changes <Box component="span" sx={{ ml: 'auto', fontWeight: 'bold', color: '#2e7d32' }}>$89-120</Box>
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        🛑 Brake Service <Box component="span" sx={{ ml: 'auto', fontWeight: 'bold', color: '#2e7d32' }}>$200-400</Box>
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        🔍 Engine Diagnostics <Box component="span" sx={{ ml: 'auto', fontWeight: 'bold', color: '#2e7d32' }}>$150-200</Box>
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', fontWeight: 500, color: '#1976d2' }}>
                        🏆 European Vehicle Specialists
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box textAlign="center" mt={6}>
          <Box sx={{ 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: 2, 
            p: 3, 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <Typography variant="body1" color="white" sx={{ mb: 2, fontWeight: 500 }}>
              🤖 Powered by Azure OpenAI • 🚗 20+ Years of European Auto Expertise
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="white" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                🏆 BMW Certified
              </Typography>
              <Typography variant="body2" color="white" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ⭐ Mercedes Specialist
              </Typography>
              <Typography variant="body2" color="white" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                🔧 Audi Expert
              </Typography>
              <Typography variant="body2" color="white" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                🚗 Porsche Trained
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;