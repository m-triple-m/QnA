'use strict';

const { Quiz, Question, Option, sequelize } = require('../models/index');

/**
 * POST /quizzes  — create quiz with optional nested questions/options
 */
async function createQuiz(req, res) {
  const { title, description, questions = [] } = req.body;
  const host_id = req.user.id;

  const t = await sequelize.transaction();
  try {
    const quiz = await Quiz.create({ title, description, host_id }, { transaction: t });

    for (const q of questions) {
      const question = await Question.create(
        {
          quiz_id: quiz.id,
          text: q.text,
          type: q.type || 'mcq',
          time_limit_sec: q.time_limit_sec || 30,
          points: q.points || 10,
          order_index: q.order_index,
          media_url: q.media_url || null,
        },
        { transaction: t }
      );

      if (Array.isArray(q.options)) {
        for (const opt of q.options) {
          await Option.create(
            {
              question_id: question.id,
              text: opt.text || '',
              media_url: opt.media_url || null,
              is_correct: opt.is_correct || false,
            },
            { transaction: t }
          );
        }
      }
    }

    await t.commit();

    const created = await Quiz.findByPk(quiz.id, {
      include: [{ model: Question, as: 'questions', include: [{ model: Option, as: 'options' }] }],
    });

    return res.status(201).json({ success: true, data: { quiz: created }, message: 'Quiz created' });
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * GET /quizzes  — get host's quizzes with question count
 */
async function getMyQuizzes(req, res) {
  const { sequelize: sq } = require('../models/index');
  const quizzes = await Quiz.findAll({
    where: { host_id: req.user.id },
    include: [
      {
        model: Question,
        as: 'questions',
        attributes: [],
      },
    ],
    attributes: {
      include: [[sq.fn('COUNT', sq.col('questions.id')), 'question_count']],
    },
    group: ['Quiz.id'],
    order: [['createdAt', 'DESC']],
  });

  return res.status(200).json({ success: true, data: { quizzes }, message: 'Quizzes fetched' });
}

/**
 * GET /quizzes/:id  — full quiz with questions and options (owner only)
 */
async function getQuiz(req, res) {
  const quiz = await Quiz.findByPk(req.params.id, {
    include: [
      {
        model: Question,
        as: 'questions',
        include: [{ model: Option, as: 'options' }],
        order: [['order_index', 'ASC']],
      },
    ],
  });

  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
  if (quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  return res.status(200).json({ success: true, data: { quiz }, message: 'Quiz fetched' });
}

/**
 * PUT /quizzes/:id
 */
async function updateQuiz(req, res) {
  const quiz = await Quiz.findByPk(req.params.id);
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
  if (quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  const { title, description, is_active } = req.body;
  await quiz.update({ title, description, is_active });

  return res.status(200).json({ success: true, data: { quiz }, message: 'Quiz updated' });
}

/**
 * DELETE /quizzes/:id
 */
async function deleteQuiz(req, res) {
  const quiz = await Quiz.findByPk(req.params.id);
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
  if (quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  await quiz.destroy();

  return res.status(200).json({ success: true, data: null, message: 'Quiz deleted' });
}

/**
 * POST /quizzes/:id/questions
 */
async function addQuestion(req, res) {
  const quiz = await Quiz.findByPk(req.params.id);
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
  if (quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  const { text, type, time_limit_sec, points, order_index, media_url, options = [] } = req.body;

  const t = await sequelize.transaction();
  try {
    const question = await Question.create(
      { quiz_id: quiz.id, text, type, time_limit_sec, points, order_index, media_url },
      { transaction: t }
    );

    for (const opt of options) {
      await Option.create(
        {
          question_id: question.id,
          text: opt.text || '',
          media_url: opt.media_url || null,
          is_correct: opt.is_correct || false,
        },
        { transaction: t }
      );
    }

    await t.commit();

    const created = await Question.findByPk(question.id, {
      include: [{ model: Option, as: 'options' }],
    });

    return res.status(201).json({ success: true, data: { question: created }, message: 'Question added' });
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * PUT /quizzes/questions/:qId
 */
async function updateQuestion(req, res) {
  const question = await Question.findByPk(req.params.qId, {
    include: [{ model: Quiz, as: 'quiz' }],
  });

  if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
  if (question.quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  const { text, type, time_limit_sec, points, order_index, media_url, options } = req.body;

  const t = await sequelize.transaction();
  try {
    await question.update(
      { text, type, time_limit_sec, points, order_index, media_url: media_url || null },
      { transaction: t }
    );

    if (Array.isArray(options)) {
      await Option.destroy({ where: { question_id: question.id }, transaction: t });
      for (const opt of options) {
        await Option.create(
          {
            question_id: question.id,
            text: opt.text || '',
            media_url: opt.media_url || null,
            is_correct: opt.is_correct || false,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    const updated = await Question.findByPk(question.id, {
      include: [{ model: Option, as: 'options' }],
    });

    return res.status(200).json({ success: true, data: { question: updated }, message: 'Question updated' });
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * DELETE /quizzes/questions/:qId
 */
async function deleteQuestion(req, res) {
  const question = await Question.findByPk(req.params.qId, {
    include: [{ model: Quiz, as: 'quiz' }],
  });

  if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
  if (question.quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  await question.destroy();

  return res.status(200).json({ success: true, data: null, message: 'Question deleted' });
}

/**
 * POST /quizzes/:id/questions/reorder
 * body: [ { id, order_index } ]
 */
async function reorderQuestions(req, res) {
  const quiz = await Quiz.findByPk(req.params.id);
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
  if (quiz.host_id !== req.user.id) return res.status(403).json({ success: false, message: 'Forbidden' });

  const items = req.body; // array of { id, order_index }
  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Body must be an array of { id, order_index }' });
  }

  const t = await sequelize.transaction();
  try {
    for (const item of items) {
      await Question.update(
        { order_index: item.order_index },
        { where: { id: item.id, quiz_id: quiz.id }, transaction: t }
      );
    }
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  return res.status(200).json({ success: true, data: null, message: 'Questions reordered' });
}

module.exports = {
  createQuiz,
  getMyQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
};
