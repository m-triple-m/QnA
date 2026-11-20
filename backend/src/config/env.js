'use strict';

const path = require('path');
// Load .env from backend directory as well as current working directory
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();

const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'CLIENT_URL',
];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `[env] Missing required environment variables: ${missing.join(', ')}.\n` +
      'Copy .env.example to .env and fill in all required values.'
  );
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS || '',
  DB_NAME: process.env.DB_NAME,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL,
  UPLOAD_MAX_SIZE_MB: parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 10,
};
