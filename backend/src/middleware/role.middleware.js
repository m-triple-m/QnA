'use strict';

/**
 * Role guard middleware factory.
 *
 * Usage:
 *   router.delete('/users/:id', authenticate, requireRole('admin'), handler);
 *   router.post('/quiz', authenticate, requireRole('admin', 'host'), handler);
 *
 * @param {...string} roles - Allowed role values (e.g. 'admin', 'host')
 * @returns {Function} Express middleware
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}.`,
      });
    }

    next();
  };
}

module.exports = { requireRole };
