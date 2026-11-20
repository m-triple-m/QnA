'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const UPLOAD_MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB, 10) || 10;
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm']);

// ── Storage ──────────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${timestamp}-${random}-${baseName}${ext}`);
  },
});

// ── File filter ───────────────────────────────────────────────────────────────

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `Only jpg, jpeg, png, gif, mp4, webm files are allowed. Got: ${file.mimetype}`
      ),
      false
    );
  }
}

// ── Base multer instance ──────────────────────────────────────────────────────

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_MAX_SIZE_MB * 1024 * 1024,
  },
});

// ── Convenience wrappers ──────────────────────────────────────────────────────

/**
 * Upload a single file from the given form field.
 * @param {string} fieldName
 * @returns {import('multer').RequestHandler}
 */
function uploadSingle(fieldName) {
  return upload.single(fieldName);
}

/**
 * Upload multiple files from the given form field.
 * @param {string} fieldName
 * @param {number} maxCount
 * @returns {import('multer').RequestHandler}
 */
function uploadMultiple(fieldName, maxCount) {
  return upload.array(fieldName, maxCount);
}

module.exports = { uploadSingle, uploadMultiple };
