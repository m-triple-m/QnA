'use strict';

/**
 * Joi validation middleware factory.
 *
 * Usage:
 *   router.post('/register', validate(registerSchema), handler);
 *   router.get('/search', validate(searchSchema, 'query'), handler);
 *
 * @param {import('joi').Schema} schema - Joi schema to validate against
 * @param {'body'|'query'|'params'} target - Which part of the request to validate
 * @returns {Function} Express middleware
 */
function validate(schema, target = 'body') {
  return (req, res, next) => {
    const { error } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => d.message);
      return res.status(422).json({ success: false, errors });
    }

    next();
  };
}

module.exports = { validate };
