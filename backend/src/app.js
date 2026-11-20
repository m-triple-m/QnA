'use strict';

require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const { CLIENT_URL, NODE_ENV } = require('./config/env');
const logger = require('./config/logger');

const app = express();

// ── Security & compression ────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Rate limiting (auth routes only) ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/auth', authLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/quizzes', require('./routes/quiz.routes'));
app.use('/api/sessions', require('./routes/session.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/upload', require('./routes/upload.routes'));

// ── Frontend Static Assets & SPA Catch-All ─────────────────────────────────────
const candidateDistPaths = [
  path.join(__dirname, '../../frontend/dist'),
  path.join(process.cwd(), '../frontend/dist'),
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), 'public_html'),
  path.join(process.cwd(), 'public'),
];

let frontendDistPath = null;
for (const cand of candidateDistPaths) {
  if (fs.existsSync(path.join(cand, 'index.html'))) {
    frontendDistPath = cand;
    break;
  }
}

if (frontendDistPath) {
  logger.info(`Serving built frontend from: ${frontendDistPath}`);
  app.use(express.static(frontendDistPath));

  // Forward all non-API GET requests to index.html for React Router SPA
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// ── 404 handler (for unmatched API or static routes) ───────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  logger.error(`[${status}] ${err.message}${err.stack ? '\n' + err.stack : ''}`);

  const response = {
    success: false,
    message: err.message || 'Internal server error.',
  };

  if (NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
});

module.exports = app;