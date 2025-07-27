const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Add this line to load environment variables

const router = express.Router();

// Use the same fallback secret as server.js
const SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Debug: Log the secret being used
console.log('🔑 AUTH ROUTES - JWT_SECRET loaded:', SECRET ? 'Yes' : 'No');
console.log('🔑 AUTH ROUTES - JWT_SECRET value:', SECRET);

// Signup Route
router.post('/signup', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // In a real app, you'd hash the password and save the user
  const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });
  
  console.log('🎫 SIGNUP - Token generated for:', email);

  return res.status(200).json({ token });
});

// Login Route (same logic for now)
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Validate user here if you had a DB

  const token = jwt.sign({ email }, SECRET, { expiresIn: '1h' });
  
  console.log('🎫 LOGIN - Token generated for:', email);

  return res.status(200).json({ token });
});

module.exports = router;