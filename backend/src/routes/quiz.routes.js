'use strict';

const { Router } = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const ctrl = require('../controllers/quiz.controller');

const router = Router();

// All routes require auth + host role
router.use(authenticate, requireRole('host'));

// --- Schemas ---

const optionSchema = Joi.object({
  text: Joi.string().required(),
  is_correct: Joi.boolean().default(false),
});

const questionSchema = Joi.object({
  text: Joi.string().required(),
  type: Joi.string().valid('mcq', 'true_false', 'short_answer', 'poll').default('mcq'),
  time_limit_sec: Joi.number().integer().min(5).max(120).default(30),
  points: Joi.number().integer().min(0).max(1000).default(10),
  order_index: Joi.number().integer().required(),
  media_url: Joi.string().uri().allow(null, '').optional(),
  options: Joi.array().items(optionSchema).optional(),
});

const createQuizSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().allow(null, '').optional(),
  questions: Joi.array().items(questionSchema).optional(),
});

const updateQuizSchema = Joi.object({
  title: Joi.string().min(3).max(200).optional(),
  description: Joi.string().allow(null, '').optional(),
  is_active: Joi.boolean().optional(),
});

// --- Routes ---

router.get('/', ctrl.getMyQuizzes);
router.post('/', validate(createQuizSchema), ctrl.createQuiz);

// /questions/:qId must come BEFORE /:id to avoid route collision
router.put('/questions/:qId', validate(questionSchema), ctrl.updateQuestion);
router.delete('/questions/:qId', ctrl.deleteQuestion);

router.get('/:id', ctrl.getQuiz);
router.put('/:id', validate(updateQuizSchema), ctrl.updateQuiz);
router.delete('/:id', ctrl.deleteQuiz);
router.post('/:id/questions', validate(questionSchema), ctrl.addQuestion);
router.post('/:id/questions/reorder', ctrl.reorderQuestions);

module.exports = router;
