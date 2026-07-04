const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// Protect routes - Verify Token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token signature & expiry
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');

      // Get user and the stored session token hash
      req.user = await User.findById(decoded.id).select('-password +activeSessionToken');

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      // Single-session check: compare incoming token hash with stored hash
      const incomingHash = crypto.createHash('sha256').update(token).digest('hex');
      if (req.user.activeSessionToken && req.user.activeSessionToken !== incomingHash) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_TAKEN',
          message: 'This account is already logged in on another device.',
        });
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// Role authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user ? req.user.role : 'none'}) is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
