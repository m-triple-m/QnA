'use strict';

const { CLIENT_URL, NODE_ENV } = require('./env');
const logger = require('./logger');

// Parse comma-separated origins from CLIENT_URL
const configuredOrigins = (CLIENT_URL || '')
  .split(',')
  .map((u) => u.trim().replace(/\/+$/, ''))
  .filter(Boolean);

/**
 * Checks whether an incoming origin is allowed.
 * Supports:
 *  - Configured CLIENT_URL (single or comma-separated)
 *  - localhost & 127.0.0.1 on any port
 *  - Local network / Wi-Fi IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port
 *  - Digipodium domains (*.digipodium.com)
 *  - Requests with no origin (curl, mobile webviews, Postman, server-to-server)
 *  - All origins in development mode (NODE_ENV !== 'production')
 */
function isOriginAllowed(origin, callback) {
  // Allow requests without origin header (e.g. same-origin, curl, server-to-server, mobile apps)
  if (!origin) {
    return callback ? callback(null, true) : true;
  }

  const cleanOrigin = origin.trim().replace(/\/+$/, '');

  // 1. Direct match with configured CLIENT_URL(s)
  if (configuredOrigins.includes(cleanOrigin)) {
    return callback ? callback(null, true) : true;
  }

  // 2. Localhost / Loopback
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(cleanOrigin)) {
    return callback ? callback(null, true) : true;
  }

  // 3. Local Network / LAN IP (e.g. 192.168.18.61:5173, 10.0.0.x, 172.16-31.x.x)
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i.test(cleanOrigin)) {
    return callback ? callback(null, true) : true;
  }

  // 4. Digipodium domains
  if (/^https?:\/\/([a-z0-9-]+\.)?digipodium\.com(:\d+)?$/i.test(cleanOrigin)) {
    return callback ? callback(null, true) : true;
  }

  // 5. In non-production environments, allow dynamically to facilitate local network testing
  if (NODE_ENV !== 'production') {
    return callback ? callback(null, true) : true;
  }

  logger.warn(`[cors] Blocked origin: ${cleanOrigin}`);
  if (callback) {
    return callback(null, false);
  }
  return false;
}

const corsOptions = {
  origin: isOriginAllowed,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200,
};

module.exports = {
  isOriginAllowed,
  corsOptions,
};
