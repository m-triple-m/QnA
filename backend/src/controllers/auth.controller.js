'use strict';

const { User } = require('../models/index');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function sanitizeUser(user) {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  delete obj.password_hash;
  return obj;
}

/**
 * POST /auth/register
 */
async function register(req, res) {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  const password_hash = await User.hashPassword(password);
  const user = await User.create({ name, email: email.toLowerCase(), password_hash, role: 'host' });

  const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  return res.status(201).json({
    success: true,
    data: { user: sanitizeUser(user), accessToken },
    message: 'Registration successful',
  });
}

/**
 * POST /auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  return res.status(200).json({
    success: true,
    data: { user: sanitizeUser(user), accessToken },
    message: 'Login successful',
  });
}

/**
 * POST /auth/refresh
 */
async function refresh(req, res) {
  let token = req.cookies && req.cookies.refreshToken;
  if (!token && req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)refreshToken=([^;]*)/);
    if (match) token = decodeURIComponent(match[1]);
  }
  if (!token && req.body && req.body.refreshToken) {
    token = req.body.refreshToken;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'No refresh token provided' });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }

  const user = await User.findByPk(payload.id);
  if (!user || !user.is_active) {
    return res.status(401).json({ success: false, message: 'User not found or inactive' });
  }

  const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
  const accessToken = generateAccessToken(tokenPayload);

  return res.status(200).json({
    success: true,
    data: { accessToken },
    message: 'Token refreshed',
  });
}

/**
 * POST /auth/logout
 */
async function logout(req, res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  return res.status(200).json({ success: true, data: null, message: 'Logged out successfully' });
}

/**
 * GET /auth/me
 */
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    data: { user: sanitizeUser(req.user) },
    message: 'User fetched',
  });
}

module.exports = { register, login, refresh, logout, getMe };
