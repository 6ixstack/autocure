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
import axios from 'axios';

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
      const response = await axios.post('/api/ai/chat', {
        message: inputMessage
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        message: response.data?.data?.message?.message || response.data?.message || 'Sorry, I encountered an error.',
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
          <Typography variant="h2" color="white" fontWeight="bold" gutterBottom>
            🚗 AutoCure AI Platform
          </Typography>
          <Typography variant="h5" color="white" sx={{ opacity: 0.9 }}>
            AI-Powered European Auto Repair Specialists
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
                p: 2,
                textAlign: 'center'
              }}>
                <Typography variant="h6" fontWeight="bold">
                  💬 Chat with our AI Assistant
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Get instant help with services, pricing, and appointments
                </Typography>
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
                <Card elevation={4}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      <LocationIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      AutoCure Location
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      123 Main St, Brampton, ON L6T 4M5
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      📞 +1-905-123-4567
                    </Typography>
                    <Typography variant="body2">
                      ✉️ info@autocure.net
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Hours */}
              <Grid item xs={12}>
                <Card elevation={4}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      <TimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Business Hours
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Monday - Friday: 8:00 AM - 6:00 PM
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      Saturday: 9:00 AM - 4:00 PM
                    </Typography>
                    <Typography variant="body2">
                      Sunday: Closed
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Services */}
              <Grid item xs={12}>
                <Card elevation={4}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom color="primary">
                      <ServiceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Popular Services
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      🔧 Oil Changes ($89-120)
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      🛠️ Brake Service ($200-400)
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      🔍 Engine Diagnostics ($150-200)
                    </Typography>
                    <Typography variant="body2">
                      🚗 European Vehicle Specialists
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box textAlign="center" mt={4}>
          <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
            🤖 Powered by Azure OpenAI | 🚗 20+ Years of European Auto Expertise
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default HomePage;