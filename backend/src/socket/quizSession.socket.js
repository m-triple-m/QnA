const { Session, Participant, Question, Option, Answer, Quiz } = require('../models');
const { verifyAccessToken } = require('../utils/jwt.utils');
const logger = require('../config/logger');

// In-memory store: sessionId → { hostSocketId, questionTimer }
const sessionStore = new Map();

module.exports = function(io) {
  
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // ─── HOST EVENTS ────────────────────────────────────────────────────

    // Host authenticates and joins their session room
    // Event: 'host:join_session'  payload: { token, sessionId }
    socket.on('host:join_session', async ({ token, sessionId }) => {
      try {
        const decoded = verifyAccessToken(token);
        if (!decoded || !['admin','host'].includes(decoded.role)) {
          return socket.emit('error', { message: 'Unauthorized' });
        }
        const session = await Session.findOne({
          where: { id: sessionId },
          include: [{ model: Quiz, as: 'quiz', where: { host_id: decoded.id } }]
        });
        if (!session) return socket.emit('error', { message: 'Session not found' });

        const roomId = `session:${sessionId}`;
        socket.join(roomId);
        socket.join(`host:${sessionId}`);

        if (!sessionStore.has(sessionId)) sessionStore.set(sessionId, {});
        sessionStore.get(sessionId).hostSocketId = socket.id;

        // Send current participant list
        const participants = await Participant.findAll({ where: { session_id: sessionId }, order: [['score','DESC']] });
        socket.emit('session:state', { session, participants });
        logger.info(`Host joined session ${sessionId}`);
      } catch (err) {
        logger.error('host:join_session error', err);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Host starts the session
    // Event: 'host:start_session'  payload: { sessionId }
    socket.on('host:start_session', async ({ sessionId }) => {
      try {
        const session = await Session.findByPk(sessionId);
        if (!session || session.status !== 'waiting') {
          return socket.emit('error', { message: 'Session cannot be started' });
        }
        await session.update({ status: 'live', started_at: new Date() });
        io.to(`session:${sessionId}`).emit('session:started', { message: 'Quiz is starting!' });
        logger.info(`Session ${sessionId} started`);
      } catch (err) {
        logger.error('host:start_session error', err);
        socket.emit('error', { message: 'Failed to start session' });
      }
    });

    // Host pushes the next question
    // Event: 'host:next_question'  payload: { sessionId, questionIndex }
    socket.on('host:next_question', async ({ sessionId, questionIndex }) => {
      try {
        const session = await Session.findOne({
          where: { id: sessionId, status: 'live' },
          include: [{ model: Quiz, as: 'quiz', include: [{ model: Question, as: 'questions', order: [['order_index','ASC']] }] }]
        });
        if (!session) return socket.emit('error', { message: 'Session not live' });
        
        const questions = session.quiz.questions;
        const question = questions[questionIndex];
        if (!question) return socket.emit('error', { message: 'Question not found' });

        await session.update({ current_question_index: questionIndex });

        // Load options. For MCQ/true_false/poll — send shuffled options (hide is_correct)
        const options = await Option.findAll({ where: { question_id: question.id } });
        const safeOptions = options.map(o => ({ id: o.id, text: o.text }));
        
        // Clear any existing timer for this session
        const store = sessionStore.get(sessionId) || {};
        if (store.questionTimer) clearTimeout(store.questionTimer);

        const questionPayload = {
          questionIndex,
          total: questions.length,
          id: question.id,
          text: question.text,
          type: question.type,
          media_url: question.media_url,
          time_limit_sec: question.time_limit_sec,
          points: question.points,
          options: safeOptions,
        };

        // Broadcast to all in room
        io.to(`session:${sessionId}`).emit('session:question', questionPayload);

        // Auto-advance timer: after time_limit_sec, emit time_up and show correct answer
        store.questionTimer = setTimeout(async () => {
          const correctOptions = options.filter(o => o.is_correct).map(o => ({ id: o.id, text: o.text }));
          io.to(`session:${sessionId}`).emit('session:time_up', {
            questionId: question.id,
            correctOptions,
          });
          // Send leaderboard after time_up
          const participants = await Participant.findAll({ where: { session_id: sessionId }, order: [['score','DESC']], limit: 10 });
          io.to(`session:${sessionId}`).emit('session:leaderboard', { leaderboard: participants.map((p,i) => ({ rank: i+1, nickname: p.nickname, score: p.score })) });
        }, (question.time_limit_sec + 2) * 1000); // 2s grace

        sessionStore.set(sessionId, store);
        logger.info(`Session ${sessionId} question ${questionIndex} pushed`);
      } catch (err) {
        logger.error('host:next_question error', err);
        socket.emit('error', { message: 'Failed to push question' });
      }
    });

    // Host manually reveals answer / ends question timer early
    // Event: 'host:reveal_answer' payload: { sessionId }
    socket.on('host:reveal_answer', async ({ sessionId }) => {
      try {
        const store = sessionStore.get(sessionId) || {};
        if (store.questionTimer) {
          clearTimeout(store.questionTimer);
          store.questionTimer = null;
        }

        const session = await Session.findOne({
          where: { id: sessionId, status: 'live' },
          include: [{ model: Quiz, as: 'quiz', include: [{ model: Question, as: 'questions', order: [['order_index', 'ASC']] }] }],
        });
        if (!session) return socket.emit('error', { message: 'Session not live' });

        const questions = session.quiz.questions;
        const question = questions[session.current_question_index];
        if (!question) return socket.emit('error', { message: 'Question not found' });

        const options = await Option.findAll({ where: { question_id: question.id } });
        const correctOptions = options.filter(o => o.is_correct).map(o => ({ id: o.id, text: o.text }));

        io.to(`session:${sessionId}`).emit('session:time_up', {
          questionId: question.id,
          correctOptions,
        });

        const participants = await Participant.findAll({
          where: { session_id: sessionId },
          order: [['score', 'DESC']],
          limit: 10,
        });
        io.to(`session:${sessionId}`).emit('session:leaderboard', {
          leaderboard: participants.map((p, i) => ({ rank: i + 1, nickname: p.nickname, score: p.score })),
        });
        logger.info(`Host revealed answer early for session ${sessionId} question ${session.current_question_index}`);
      } catch (err) {
        logger.error('host:reveal_answer error', err);
        socket.emit('error', { message: 'Failed to reveal answer' });
      }
    });

    // Host ends the session
    // Event: 'host:end_session'  payload: { sessionId }
    socket.on('host:end_session', async ({ sessionId }) => {
      try {
        const store = sessionStore.get(sessionId);
        if (store?.questionTimer) clearTimeout(store.questionTimer);
        sessionStore.delete(sessionId);

        const session = await Session.findByPk(sessionId);
        if (session) await session.update({ status: 'ended', ended_at: new Date() });

        const participants = await Participant.findAll({ where: { session_id: sessionId }, order: [['score','DESC']] });
        io.to(`session:${sessionId}`).emit('session:ended', {
          message: 'Quiz has ended!',
          finalLeaderboard: participants.map((p, i) => ({ rank: i+1, nickname: p.nickname, score: p.score })),
        });
        logger.info(`Session ${sessionId} ended`);
      } catch (err) {
        logger.error('host:end_session error', err);
        socket.emit('error', { message: 'Failed to end session' });
      }
    });

    // ─── PARTICIPANT EVENTS ─────────────────────────────────────────────

    // Participant joins the session via QR scan
    // Event: 'participant:join'  payload: { sessionCode, nickname }
    socket.on('participant:join', async ({ sessionCode, nickname }) => {
      try {
        if (!nickname || nickname.trim().length < 1 || nickname.trim().length > 30) {
          return socket.emit('error', { message: 'Nickname must be 1-30 characters' });
        }
        const session = await Session.findOne({
          where: { code: sessionCode },
          include: [{ model: Quiz, as: 'quiz', include: [{ association: 'host', attributes: ['name'] }] }],
        });
        if (!session) return socket.emit('error', { message: 'Session not found' });
        if (session.status === 'ended') return socket.emit('error', { message: 'This quiz has already ended' });

        // Check nickname uniqueness in this session
        const existing = await Participant.findOne({ where: { session_id: session.id, nickname: nickname.trim() } });
        if (existing) {
          // Update socket_id if reconnecting
          await existing.update({ socket_id: socket.id });
          socket.join(`session:${session.id}`);
          socket.emit('session:joined', { participantId: existing.id, sessionId: session.id, nickname: existing.nickname, quizTitle: session.quiz.title, status: session.status });
        } else {
          const participant = await Participant.create({
            session_id: session.id,
            nickname: nickname.trim(),
            socket_id: socket.id,
            joined_at: new Date(),
          });
          socket.join(`session:${session.id}`);
          socket.emit('session:joined', { participantId: participant.id, sessionId: session.id, nickname: participant.nickname, quizTitle: session.quiz.title, status: session.status });
        }

        // Notify host of new participant
        const count = await Participant.count({ where: { session_id: session.id } });
        io.to(`host:${session.id}`).emit('session:participant_joined', { nickname: nickname.trim(), participantCount: count });
        logger.info(`Participant ${nickname} joined session ${session.id}`);
      } catch (err) {
        logger.error('participant:join error', err);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Participant submits answer
    // Event: 'participant:answer'  payload: { participantId, sessionId, questionId, optionId, textAnswer, timeTakenMs }
    socket.on('participant:answer', async ({ participantId, sessionId, questionId, optionId, textAnswer, timeTakenMs }) => {
      try {
        const participant = await Participant.findByPk(participantId);
        if (!participant || participant.session_id !== sessionId) {
          return socket.emit('error', { message: 'Invalid participant' });
        }

        // Prevent duplicate answers for same question
        const existingAnswer = await Answer.findOne({ where: { participant_id: participantId, question_id: questionId } });
        if (existingAnswer) return socket.emit('answer:already_submitted', {});

        const question = await Question.findByPk(questionId, { include: [{ model: Option, as: 'options' }] });
        if (!question) return socket.emit('error', { message: 'Question not found' });

        let isCorrect = false;
        let pointsAwarded = 0;

        if (question.type === 'short_answer') {
          // Short answer: manual review needed; mark as pending (not scored automatically)
          isCorrect = false;
        } else if (optionId) {
          const selectedOption = question.options.find(o => o.id === optionId);
          isCorrect = selectedOption?.is_correct || false;
          if (isCorrect) {
            // Speed bonus: more points for faster answers (time_taken_ms vs time_limit_sec)
            const timeFraction = Math.max(0, 1 - timeTakenMs / (question.time_limit_sec * 1000));
            pointsAwarded = Math.round(question.points * (0.5 + 0.5 * timeFraction));
          }
        }

        await Answer.create({ participant_id: participantId, question_id: questionId, option_id: optionId || null, text_answer: textAnswer || null, time_taken_ms: timeTakenMs, is_correct: isCorrect, points_awarded: pointsAwarded });

        if (pointsAwarded > 0) {
          await participant.increment('score', { by: pointsAwarded });
        }

        socket.emit('answer:result', { isCorrect, pointsAwarded, totalScore: participant.score + pointsAwarded });

        // Notify host with option details for live slide updates
        io.to(`host:${sessionId}`).emit('session:answer_received', {
          participantId,
          optionId: optionId || null,
          textAnswer: textAnswer || null,
          isCorrect,
          pointsAwarded,
        });
        logger.info(`Participant ${participantId} answered question ${questionId}`);
      } catch (err) {
        logger.error('participant:answer error', err);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    // ─── DISCONNECT ─────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      try {
        logger.info(`Socket disconnected: ${socket.id}`);
        // Update participant socket_id to null (they may reconnect)
        await Participant.update({ socket_id: null }, { where: { socket_id: socket.id } });
      } catch (err) {
        logger.error('disconnect cleanup error', err);
      }
    });
  });
};
