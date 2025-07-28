// server.js - Updated for Enhanced Humanization
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

console.log('🔑 JWT_SECRET loaded:', SECRET ? 'Yes' : 'No');
console.log('🔑 JWT_SECRET value:', SECRET);

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token.' });
    }
    req.user = user;
    next();
  });
}

// OpenAI Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced Humanization Route
app.post('/humanize', verifyToken, async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Invalid input: text is required.' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional text editor helping improve the readability and originality of texts. Your task is to humanize text without making it overly casual or sounding like personal speech.

Guidelines:
- DO NOT contract "are not" to "aren't", "is not" to "isn't", etc.
- Maintain the original length and structure as much as possible.
- DO NOT rephrase or change headings/titles.
- Avoid first-person or personal commentary.
- Use context-aware and stylistically varied rephrasing.
- Enhance tone to sound more natural and human-written.
- Introduce slight sentence complexity and natural inconsistencies.
- Vary sentence and paragraph lengths.
- Subtly incorporate idioms or cultural nuances where relevant.
- Avoid repetitive vocabulary or rhythm.
- Avoid sounding overly formal or too robotic.
- Do not explicitly say you are an AI or language model.

Return only the humanized version of the text. Do not add explanations or summaries.Final output must evade AI detection while preserving clarity and factual consistency.`,

        },
        {
          role: 'user',
          content: `Please humanize the following text while applying the above rules:\n\n${text}`,
        },
      ],
      temperature: 0.75,
      max_tokens: 800,
    });

    const humanizedText = response.choices[0].message.content;
    return res.status(200).json({ humanizedText });
  } catch (err) {
    console.error('❌ OpenAI error:', err);
    return res.status(500).json({ error: 'Failed to humanize text using AI.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
