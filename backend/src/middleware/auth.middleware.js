'use strict';

const { verifyAccessToken } = require('../utils/jwt.utils');
const { User } = require('../models');
const logger = require('../config/logger');

/**
 * Authenticate middleware.
 * Expects: Authorization: Bearer <token>
 * On success: attaches decoded user to req.user and continues.
 * On failure: returns 401 JSON.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token is required.' });
    }

    const token = authHeader.slice(7); // strip "Bearer "

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired access token.' });
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error(`authenticate middleware error: ${err.message}`);
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
}

module.exports = { authenticate };
