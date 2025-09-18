// Simple test server for debugging
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Test API server is running'
  });
});

// Auth login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  
  const { email, password } = req.body;
  
  // Simple test authentication
  if (email === 'admin@akocourses.com' && password === 'admin123') {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: '1',
        email: 'admin@akocourses.com',
        role: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User'
      },
      tokens: {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Test API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
});