'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const ctrl = require('../controllers/session.controller');

const router = Router();

// Public
router.get('/:code/join', ctrl.getJoinInfo);
router.get('/join/:code', ctrl.getJoinInfo);

// Host-only
router.post('/', authenticate, requireRole('host'), ctrl.createSession);
router.post('/open-poll', authenticate, requireRole('host'), ctrl.createOpenPollSession);
router.get('/:id/results', authenticate, requireRole('host'), ctrl.getSessionResults);
router.get('/:id/export', authenticate, requireRole('host'), ctrl.exportSessionResults);
router.get('/:id', authenticate, requireRole('host'), ctrl.getSessionById);
router.get('/', authenticate, requireRole('host'), ctrl.getHostSessions);

module.exports = router;
