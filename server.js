// server.js - Debug Version
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const jwt = require('jsonwebtoken');

const authRoutes = require('./authRoutes');

dotenv.config();

const app = express();
const PORT = 5000;
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Debug: Log the secret being used
console.log('🔑 JWT_SECRET loaded:', SECRET ? 'Yes' : 'No');
console.log('🔑 JWT_SECRET value:', SECRET);

app.use(cors());
app.use(express.json());

// Use auth routes
app.use('/auth', authRoutes);

// JWT verification middleware with debugging
function verifyToken(req, res, next) {
  console.log('🔍 verifyToken middleware called');
  
  const authHeader = req.headers['authorization'];
  console.log('📋 Auth header:', authHeader);
  
  const token = authHeader && authHeader.split(' ')[1];
  console.log('🎫 Extracted token:', token ? `${token.substring(0, 20)}...` : 'null');

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      console.log('❌ JWT verification error:', err.message);
      console.log('❌ Error type:', err.name);
      return res.status(403).json({ error: 'Invalid token.' });
    }
    console.log('✅ Token verified successfully for user:', user);
    req.user = user;
    next();
  });
}

// OpenAI config
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Protected humanize route
app.post('/humanize', verifyToken, async (req, res) => {
  console.log('📝 Humanize route called by user:', req.user);
  
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Invalid input: text is required.' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4', // or 'gpt-3.5-turbo'
      messages: [
        {
          role: 'system',
          content:
            'You are a writing assistant that humanizes AI-written or robotic text to make it sound more natural, conversational, and original while keeping its meaning.',
        },
        {
          role: 'user',
          content: `Please humanize the following text:\n\n${text}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const humanizedText = response.choices[0].message.content;
    return res.status(200).json({ humanizedText });
  } catch (err) {
    console.error('OpenAI error:', err);
    return res.status(500).json({ error: 'Failed to humanize text using AI.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});