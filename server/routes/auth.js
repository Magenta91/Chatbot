const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');
const rateLimiter = require('../services/rateLimiter');
const safety = require('../services/safety');
const observability = require('../services/observability');

const router = express.Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimiter.createMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per window
  keyGenerator: (req) => `auth:${req.ip}:${req.body.email || req.body.username || 'unknown'}`
});

// Register endpoint
router.post('/register', authRateLimit, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      observability.warn('Registration attempt with missing fields', { correlationId });
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Username, email, and password are required'
      });
    }

    // Basic validation
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      observability.warn('Registration attempt with existing credentials', { 
        email, 
        username, 
        correlationId 
      });
      return res.status(409).json({
        error: 'User already exists',
        message: 'A user with this email or username already exists'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        role: user.role 
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    observability.info('User registered successfully', {
      userId: user._id,
      username,
      email,
      correlationId
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences
      }
    });

  } catch (error) {
    observability.error('Registration failed', error, { correlationId });
    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

// Login endpoint
router.post('/login', authRateLimit, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      observability.warn('Login attempt with missing credentials', { correlationId });
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      observability.warn('Login attempt with invalid email', { email, correlationId });
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      observability.warn('Login attempt with invalid password', { 
        userId: user._id, 
        correlationId 
      });
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Check if user has exceeded quotas
    if (user.hasExceededQuotas()) {
      observability.warn('Login blocked due to quota exceeded', { 
        userId: user._id, 
        correlationId 
      });
      return res.status(429).json({
        error: 'Quota exceeded',
        message: 'Daily usage quota exceeded. Please try again tomorrow.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username,
        role: user.role 
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    observability.info('User logged in successfully', {
      userId: user._id,
      username: user.username,
      correlationId
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
        usage: user.usage,
        quotas: user.quotas
      }
    });

  } catch (error) {
    observability.error('Login failed', error, { correlationId });
    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
        usage: user.usage,
        quotas: user.quotas,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    observability.error('Failed to get user profile', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'An error occurred while fetching profile'
    });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  const correlationId = req.correlationId;
  
  try {
    const { defaultProvider, defaultModel, defaultTemperature, systemPrompt } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User not found'
      });
    }

    // Update preferences
    if (defaultProvider) user.preferences.defaultProvider = defaultProvider;
    if (defaultModel) user.preferences.defaultModel = defaultModel;
    if (defaultTemperature !== undefined) user.preferences.defaultTemperature = defaultTemperature;
    if (systemPrompt !== undefined) user.preferences.systemPrompt = systemPrompt;

    await user.save();

    observability.info('User preferences updated', {
      userId: user._id,
      preferences: user.preferences,
      correlationId
    });

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });

  } catch (error) {
    observability.error('Failed to update preferences', error, { 
      userId: req.user.userId, 
      correlationId 
    });
    res.status(500).json({
      error: 'Failed to update preferences',
      message: 'An error occurred while updating preferences'
    });
  }
});

// Logout (optional - mainly for client-side token cleanup)
router.post('/logout', authenticateToken, (req, res) => {
  const correlationId = req.correlationId;
  
  observability.info('User logged out', {
    userId: req.user.userId,
    correlationId
  });

  res.json({
    message: 'Logout successful'
  });
});

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'No token provided'
    });
  }

  jwt.verify(token, config.jwtSecret, (err, user) => {
    if (err) {
      observability.warn('Invalid token used', { 
        error: err.message, 
        correlationId: req.correlationId 
      });
      return res.status(403).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
    }

    req.user = user;
    next();
  });
}

module.exports = { router, authenticateToken };