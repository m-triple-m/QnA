'use strict';

const jwt = require('jsonwebtoken');
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
} = require('../config/env');

/**
 * Convert any input (Sequelize Model, custom class, or plain object) to a safe plain payload.
 * @param {object} payload
 * @returns {object} Plain JavaScript object
 */
function toPlainPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { id: payload };
  }
  let plain = payload;
  if (typeof payload.toJSON === 'function') {
    plain = payload.toJSON();
  } else if (typeof payload.get === 'function') {
    plain = payload.get({ plain: true });
  } else {
    plain = { ...payload };
  }
  delete plain.password_hash;
  return {
    id: plain.id,
    email: plain.email,
    role: plain.role,
    name: plain.name,
  };
}

/**
 * Generate a short-lived access token.
 * @param {object} payload - Data to embed (e.g. { id, role } or User model)
 * @returns {string} Signed JWT
 */
function generateAccessToken(payload) {
  return jwt.sign(toPlainPayload(payload), JWT_SECRET, { expiresIn: JWT_EXPIRES_IN || '15m' });
}

/**
 * Generate a long-lived refresh token.
 * @param {object} payload - Data to embed (e.g. { id, role } or User model)
 * @returns {string} Signed JWT
 */
function generateRefreshToken(payload) {
  return jwt.sign(toPlainPayload(payload), JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN || '7d' });
}

/**
 * Verify an access token.
 * @param {string} token
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {object} Decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
