'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/admin.controller');

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/users', ctrl.getAllUsers);
router.put('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);
router.get('/quizzes', ctrl.getAllQuizzes);
router.get('/analytics', ctrl.getPlatformAnalytics);

module.exports = router;
