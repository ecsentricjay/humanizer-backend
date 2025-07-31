// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const jwt = require('jsonwebtoken');
const authRoutes = require('./authRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/auth', authRoutes);

// JWT verification middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = user;
    next();
  });
}

// Enhanced human-like prompt for GPT
const SYSTEM_PROMPT = `
You are an expert academic writer with 20 years of experience. Your task is to refine text to make it appear authentically human-written while preserving all original content and meaning.

Key requirements:
1. Structural elements:
   - Preserve all headings, subheadings, and formatting exactly
   - Maintain the original document structure and length
   - Keep all technical terms, proper nouns, and specialized vocabulary

2. Stylistic adjustments:
   - Vary sentence structure significantly (mix short/long sentences)
   - Use occasional intentional minor grammatical imperfections
   - Include appropriate transitional phrases between ideas
   - Apply natural paragraph breaks where human writers would pause
   - Use 10-15% more complex sentences than typical AI output

3. Linguistic features:
   - Incorporate occasional colloquialisms appropriate for academic writing
   - Use slightly more metaphors/analogies than typical AI (but not excessive)
   - Include rare but correct vocabulary (1-2 uncommon words per paragraph)
   - Apply subtle changes in tone within the same piece

4. Anti-detection measures:
   - Avoid any phrases commonly flagged as AI markers
   - Introduce very minor, human-like inconsistencies in style
   - Occasionally restate concepts using different wording
   - Include 1-2 slightly tangential but relevant thoughts per page

Output must be indistinguishable from skilled human writing at the postgraduate level.
`;

// Enhanced post-processing function
function applyHumanLikeTouch(text) {
  // First pass - basic cleanup with randomized replacements
  let processed = text
    .replace(/\bfor example\b/gi, (match) => 
      Math.random() > 0.7 ? 'for instance' : 
      Math.random() > 0.4 ? 'as an illustration' : 'say')
    .replace(/\btherefore\b/gi, () => 
      Math.random() > 0.6 ? 'consequently' : 
      Math.random() > 0.3 ? 'thus' : 'so')
    .replace(/\butilize\b/gi, 'use')
    .replace(/\bIn conclusion\b/gi, () => 
      Math.random() > 0.7 ? 'To summarize' : 
      Math.random() > 0.4 ? 'Ultimately' : 'In summary')
    .replace(/\bThis shows that\b/gi, () => 
      Math.random() > 0.6 ? 'This demonstrates' : 
      Math.random() > 0.3 ? 'This indicates' : 'This means');

  // Second pass - sentence structure variations
  processed = processed.replace(/([^.!?]+)([.!?])/g, (match, p1, p2) => {
    // 20% chance to add a very human-like interjection
    if (Math.random() > 0.8) {
      const interjections = [' Interestingly,', ' Surprisingly,', ' Notably,'];
      return interjections[Math.floor(Math.random() * interjections.length)] + ' ' + 
        p1.charAt(0).toLowerCase() + p1.slice(1) + p2;
    }
    return match;
  });

  // Third pass - paragraph rhythm
  const paragraphs = processed.split('\n\n');
  processed = paragraphs.map(para => {
    // Occasionally start with a very short sentence
    if (Math.random() > 0.9 && para.length > 200) {
      const sentences = para.split(/(?<=[.!?])\s+/);
      if (sentences.length > 2) {
        sentences.splice(1, 0, 'This point deserves emphasis.');
        return sentences.join(' ');
      }
    }
    return para;
  }).join('\n\n');

  // Final cleanup
  return processed
    .replace(/(\w{5,})(\s+\1)/gi, '$1')
    .replace(/([^.?!])\s*\n/g, '$1. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Protected route with enhanced humanization
app.post('/humanize', verifyToken, async (req, res) => {
  const { text, temperature = 0.75, model = 'gpt-4-turbo' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Invalid input: text is required.' });
  }

  try {
    // First pass - initial humanization
    const firstPass = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Please humanize the following text:\n\n${text}` },
      ],
      temperature: Math.min(0.9, Math.max(0.5, parseFloat(temperature))),
      max_tokens: 4000,
    });

    const firstPassOutput = firstPass.choices[0].message.content;

    // Second pass - refinement (optional, for higher quality)
    let finalOutput = firstPassOutput;
    if (text.length > 1000) {
      const secondPass = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Please refine this text to make it sound even more human-like, paying special attention to varying sentence structure and adding subtle imperfections:\n\n${firstPassOutput}` },
        ],
        temperature: Math.min(0.95, Math.max(0.6, parseFloat(temperature) + 0.1)),
        max_tokens: 4000,
      });
      finalOutput = secondPass.choices[0].message.content;
    }

    const humanizedText = applyHumanLikeTouch(finalOutput);
    return res.status(200).json({ humanizedText });

  } catch (err) {
    console.error('❌ OpenAI error:', err);
    return res.status(500).json({ 
      error: 'Failed to humanize text using AI.',
      details: err.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('⚠️ Server error:', err.stack);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
