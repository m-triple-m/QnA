'use strict';

const { Session, Quiz, User, Participant, Question, Answer, Option, sequelize } = require('../models/index');
const { generateQRCode } = require('../utils/qr.utils');
const { exportSessionCSV } = require('../utils/export.utils');
const { Op } = require('sequelize');

/**
 * Generate a unique 6-char alphanumeric session code
 */
async function generateUniqueCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let exists = true;
  while (exists) {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const found = await Session.findOne({ where: { code } });
    exists = !!found;
  }
  return code;
}

/**
 * Dynamically resolves the client base URL for join links & QR codes.
 * In development / LAN mode, dynamically matches the requesting origin
 * (e.g. http://192.168.3.140:5173) so phones on the Wi-Fi scan the local server.
 */
function getClientBaseUrl(req) {
  if (req && req.headers && req.headers.origin) {
    return req.headers.origin.replace(/\/+$/, '');
  }
  if (process.env.NODE_ENV !== 'production') {
    const origins = (process.env.CLIENT_URL || '')
      .split(',')
      .map((u) => u.trim().replace(/\/+$/, ''))
      .filter(Boolean);
    const lanOrigin = origins.find((u) => !u.includes('digipodium.com'));
    if (lanOrigin) return lanOrigin;
  }
  const first = (process.env.CLIENT_URL || '').split(',')[0].trim().replace(/\/+$/, '');
  return first || 'http://localhost:5173';
}

/**
 * POST /sessions  — host creates a session
 */
async function createSession(req, res) {
  const { quiz_id } = req.body;

  const quiz = await Quiz.findByPk(quiz_id);
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
  if (quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  const code = await generateUniqueCode();
  const clientBase = getClientBaseUrl(req);
  const joinUrl = `${clientBase}/join/${code}`;
  const qr_data = await generateQRCode(joinUrl);

  const session = await Session.create({ quiz_id, code, qr_data });

  return res.status(201).json({ success: true, data: { session }, message: 'Session created' });
}

/**
 * POST /sessions/open-poll — host creates a dedicated Open Q&A / Live Poll session
 */
async function createOpenPollSession(req, res) {
  let [quiz] = await Quiz.findOrCreate({
    where: { host_id: req.user.id, title: 'Live Audience Q&A & Word Cloud' },
    defaults: {
      description: 'Interactive open question answering and live audience word clouds',
      is_active: true,
    },
  });

  const code = await generateUniqueCode();
  const clientBase = getClientBaseUrl(req);
  const joinUrl = `${clientBase}/join/${code}`;
  const qr_data = await generateQRCode(joinUrl);

  const session = await Session.create({
    quiz_id: quiz.id,
    code,
    qr_data,
    status: 'waiting',
  });

  return res.status(201).json({
    success: true,
    data: { session, quiz },
    message: 'Open Q&A session created',
  });
}

/**
 * GET /sessions/:code/join  — public join info
 */
async function getJoinInfo(req, res) {
  const code = (req.params.code || '').trim().toUpperCase();

  const session = await Session.findOne({
    where: { code },
    include: [
      {
        model: Quiz,
        as: 'quiz',
        include: [{ model: User, as: 'host', attributes: ['id', 'name'] }],
      },
    ],
  });

  if (!session) {
    return res.status(404).json({ success: false, message: 'Session not found. Please check your PIN.' });
  }

  if (session.status === 'ended') {
    return res.status(400).json({ success: false, message: 'This quiz session has already ended.' });
  }

  const participant_count = await Participant.count({ where: { session_id: session.id } });

  return res.status(200).json({
    success: true,
    data: {
      quiz_title: session.quiz?.title || 'Live Quiz',
      host_name: session.quiz?.host?.name || 'Quiz Master',
      participant_count,
      status: session.status,
      code: session.code,
    },
    message: 'Join info fetched',
  });
}

/**
 * GET /sessions/:id/results  — host only, full results
 */
async function getSessionResults(req, res) {
  const session = await Session.findByPk(req.params.id, {
    include: [
      {
        model: Quiz,
        as: 'quiz',
        attributes: ['id', 'title', 'host_id'],
      },
      {
        model: Participant,
        as: 'participants',
        include: [
          {
            model: Answer,
            as: 'answers',
            include: [
              { model: Question, as: 'question', attributes: ['id', 'text', 'type', 'points'] },
              { model: Option, as: 'option', attributes: ['id', 'text', 'is_correct'] },
            ],
          },
        ],
        order: [['score', 'DESC']],
      },
    ],
  });

  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  // Sort participants by score descending and add rank
  const ranked = [...session.participants].sort((a, b) => b.score - a.score).map((p, i) => ({
    rank: i + 1,
    ...p.toJSON(),
  }));

  return res.status(200).json({
    success: true,
    data: { session: { ...session.toJSON(), participants: ranked } },
    message: 'Results fetched',
  });
}

/**
 * GET /sessions/:id/export  — host only, CSV stream
 */
async function exportSessionResults(req, res) {
  const session = await Session.findByPk(req.params.id, {
    include: [{ model: Quiz, as: 'quiz', attributes: ['id', 'title', 'host_id'] }],
  });

  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="session-${session.code}-results.csv"`);

  await exportSessionCSV(session.id, res);
}

/**
 * GET /sessions  — host's sessions, paginated
 */
async function getHostSessions(req, res) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  // Find all quiz IDs owned by host
  const hostQuizzes = await Quiz.findAll({ where: { host_id: req.user.id }, attributes: ['id'] });
  const quizIds = hostQuizzes.map((q) => q.id);

  const { count, rows: sessions } = await Session.findAndCountAll({
    where: { quiz_id: { [Op.in]: quizIds } },
    include: [{ model: Quiz, as: 'quiz', attributes: ['id', 'title'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return res.status(200).json({
    success: true,
    data: {
      sessions,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    },
    message: 'Sessions fetched',
  });
}

/**
 * GET /sessions/:id — get a single session by ID
 */
async function getSessionById(req, res) {
  const session = await Session.findOne({
    where: { id: req.params.id },
    include: [{ model: Quiz, as: 'quiz' }],
  });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  if (session.quiz && session.quiz.host_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  // Ensure qr_data exists if it was null
  if (!session.qr_data && session.code) {
    const clientBase = getClientBaseUrl(req);
    session.qr_data = await generateQRCode(`${clientBase}/join/${session.code}`);
    await session.save();
  }

  // Also include current participants so host immediately sees connected audience
  const participants = await Participant.findAll({
    where: { session_id: session.id },
    order: [['joined_at', 'ASC']],
  });

  return res.status(200).json({ success: true, data: { session, participants }, message: 'Session fetched' });
}

module.exports = { createSession, createOpenPollSession, getJoinInfo, getSessionResults, exportSessionResults, getHostSessions, getSessionById };
