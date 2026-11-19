'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, printf } = format;
const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isDev = NODE_ENV !== 'production';

const logFormat = printf(({ level, message, timestamp: ts }) => {
  return `[${ts}] ${level.toUpperCase()}: ${message}`;
});

const loggerTransports = [
  new transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    ),
  }),
];

if (!isDev) {
  loggerTransports.push(
    new transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    }),
    new transports.File({
      filename: path.join('logs', 'combined.log'),
      format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
    })
  );
}

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  transports: loggerTransports,
});

module.exports = logger;
