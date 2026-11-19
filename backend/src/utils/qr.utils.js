'use strict';

const QRCode = require('qrcode');

/**
 * Generate a QR code for the given text.
 * @param {string} text - The content to encode (e.g. a join URL).
 * @returns {Promise<string>} Base64 PNG data URL (data:image/png;base64,...)
 */
async function generateQRCode(text) {
  return QRCode.toDataURL(text, {
    type: 'image/png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
  });
}

module.exports = { generateQRCode };
