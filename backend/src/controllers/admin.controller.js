'use strict';

const { User, Quiz, Session, Participant, sequelize } = require('../models/index');
const { Op } = require('sequelize');

function sanitizeUser(user) {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  delete obj.password_hash;
  return obj;
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * GET /admin/users  — paginated list with quiz count
 */
async function getAllUsers(req, res) {
  const { page, limit, offset } = parsePagination(req.query);

  const { count, rows } = await User.findAndCountAll({
    attributes: { exclude: ['password_hash'] },
    include: [{ model: Quiz, as: 'quizzes', attributes: [] }],
    attributes: {
      exclude: ['password_hash'],
      include: [[sequelize.fn('COUNT', sequelize.col('quizzes.id')), 'quiz_count']],
    },
    group: ['User.id'],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    subQuery: false,
  });

  return res.status(200).json({
    success: true,
    data: {
      users: rows,
      pagination: { total: count.length || count, page, limit, totalPages: Math.ceil((count.length || count) / limit) },
    },
    message: 'Users fetched',
  });
}

/**
 * PUT /admin/users/:id  — update is_active or role
 */
async function updateUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const { is_active, role } = req.body;
  const updates = {};
  if (is_active !== undefined) updates.is_active = is_active;
  if (role !== undefined) updates.role = role;

  await user.update(updates);

  return res.status(200).json({ success: true, data: { user: sanitizeUser(user) }, message: 'User updated' });
}

/**
 * DELETE /admin/users/:id  — soft or hard delete
 * query param: ?hard=true for hard delete; default is soft (is_active=false)
 */
async function deleteUser(req, res) {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (req.query.hard === 'true') {
    await user.destroy();
    return res.status(200).json({ success: true, data: null, message: 'User permanently deleted' });
  }

  await user.update({ is_active: false });
  return res.status(200).json({ success: true, data: { user: sanitizeUser(user) }, message: 'User deactivated' });
}

/**
 * GET /admin/quizzes  — paginated with host info
 */
async function getAllQuizzes(req, res) {
  const { page, limit, offset } = parsePagination(req.query);

  const { count, rows } = await Quiz.findAndCountAll({
    include: [{ model: User, as: 'host', attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return res.status(200).json({
    success: true,
    data: {
      quizzes: rows,
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) },
    },
    message: 'Quizzes fetched',
  });
}

/**
 * GET /admin/analytics
 */
async function getPlatformAnalytics(req, res) {
  const [totalUsers, totalQuizzes, totalSessions, totalParticipants, recentSessions] = await Promise.all([
    User.count(),
    Quiz.count(),
    Session.count(),
    Participant.count(),
    Session.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [
        { model: Quiz, as: 'quiz', attributes: ['id', 'title'] },
      ],
    }),
  ]);

  return res.status(200).json({
    success: true,
    data: { totalUsers, totalQuizzes, totalSessions, totalParticipants, recentSessions },
    message: 'Analytics fetched',
  });
}

module.exports = { getAllUsers, updateUser, deleteUser, getAllQuizzes, getPlatformAnalytics };
