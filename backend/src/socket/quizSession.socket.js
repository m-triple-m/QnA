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

        if (!sessionStore.has(Number(sessionId))) sessionStore.set(Number(sessionId), {});
        sessionStore.get(Number(sessionId)).hostSocketId = socket.id;

        const store = sessionStore.get(Number(sessionId)) || {};

        // Send current participant list with vote status
        const participants = await Participant.findAll({ where: { session_id: sessionId }, order: [['score','DESC']] });
        const participantsWithStatus = participants.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          score: p.score,
          hasVoted: Boolean(store.currentAnswers && store.currentAnswers.has(Number(p.id))),
        }));
        socket.emit('session:state', { session, participants: participantsWithStatus });

        // If an open question is active, send it and current word cloud to host immediately
        if (store.openQuestion && store.openQuestion.isOpen) {
          const wordsArray = Array.from(store.openQuestion.wordCounts.values()).map((w) => ({
            id: w.id,
            text: w.text,
            count: w.count,
            voters: Array.from(w.voters),
            isOption: w.isOption,
            optionId: w.optionId,
          })).sort((a, b) => b.count - a.count);

          socket.emit('session:open_question', {
            id: store.openQuestion.id,
            text: store.openQuestion.text,
            allowCustom: store.openQuestion.allowCustom,
            allowMultiple: store.openQuestion.allowMultiple,
            maxSubmissions: store.openQuestion.maxSubmissions,
            options: store.openQuestion.options,
            timeLimitSec: store.openQuestion.timeLimitSec,
            isOpen: store.openQuestion.isOpen,
          });

          socket.emit('session:open_word_cloud_update', {
            questionId: store.openQuestion.id,
            totalSubmissions: store.openQuestion.totalSubmissions,
            totalParticipants: store.openQuestion.answers.size,
            words: wordsArray,
          });
        }

        logger.info(`Host joined session ${sessionId}`);
      } catch (err) {
        logger.error('host:join_session error', err);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Helper to push a question to all clients in a session
    async function pushQuestion(sessionId, questionIndex = 0) {
      const session = await Session.findByPk(sessionId, {
        include: [{ model: Quiz, as: 'quiz' }],
      });
      if (!session) throw new Error('Session not found');
      if (session.status === 'ended') throw new Error('Session has ended');

      if (session.status !== 'live') {
        await session.update({ status: 'live', started_at: session.started_at || new Date() });
      }

      const questions = await Question.findAll({
        where: { quiz_id: session.quiz_id },
        order: [['order_index', 'ASC'], ['id', 'ASC']],
      });

      if (!questions || questions.length === 0) {
        throw new Error('This quiz has no questions. Please add questions first.');
      }

      const question = questions[questionIndex];
      if (!question) {
        throw new Error(`Question index ${questionIndex} out of range`);
      }

      await session.update({ current_question_index: questionIndex });

      const options = await Option.findAll({
        where: { question_id: question.id },
        order: [['id', 'ASC']],
      });
      const safeOptions = options.map((o) => ({
        id: o.id,
        text: o.text,
        media_url: o.media_url || null,
      }));

      // Clear existing question timer and reset question votes
      const store = sessionStore.get(Number(sessionId)) || {};
      if (store.questionTimer) clearTimeout(store.questionTimer);
      store.currentAnswers = new Map();
      sessionStore.set(Number(sessionId), store);

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

      // Broadcast question to all participants and host
      io.to(`session:${sessionId}`).emit('session:question', questionPayload);

      // Schedule auto-advance time_up
      store.questionTimer = setTimeout(async () => {
        // Broadcast that time is up / voting is closed
        io.to(`session:${sessionId}`).emit('session:time_up', {
          questionId: question.id,
          votingClosed: true,
        });

        // Only auto-reveal if host explicitly enabled autoReveal
        if (store.autoReveal) {
          const correctOptions = options
            .filter((o) => o.is_correct)
            .map((o) => ({ id: o.id, text: o.text, media_url: o.media_url || null }));
          io.to(`session:${sessionId}`).emit('session:time_up', {
            questionId: question.id,
            votingClosed: true,
            correctOptions,
          });
          io.to(`session:${sessionId}`).emit('session:answer_revealed', {
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
        }
      }, (question.time_limit_sec + 2) * 1000);

      sessionStore.set(Number(sessionId), store);
      logger.info(`Session ${sessionId} pushed question ${questionIndex + 1} of ${questions.length}`);
    }

    // Host starts the session
    // Event: 'host:start_session'  payload: { sessionId }
    socket.on('host:start_session', async ({ sessionId }) => {
      try {
        const session = await Session.findByPk(sessionId);
        if (!session) return socket.emit('error', { message: 'Session not found' });
        if (session.status === 'ended') return socket.emit('error', { message: 'Session has already ended' });

        await session.update({ status: 'live', started_at: session.started_at || new Date() });
        io.to(`session:${sessionId}`).emit('session:started', { message: 'Quiz is starting!' });
        logger.info(`Session ${sessionId} started`);

        // Automatically push the first question
        await pushQuestion(sessionId, 0);
      } catch (err) {
        logger.error('host:start_session error', err);
        socket.emit('error', { message: err.message || 'Failed to start session' });
      }
    });

    // Host pushes the next question
    // Event: 'host:next_question'  payload: { sessionId, questionIndex }
    socket.on('host:next_question', async ({ sessionId, questionIndex }) => {
      try {
        await pushQuestion(sessionId, Number(questionIndex));
      } catch (err) {
        logger.error('host:next_question error', err);
        socket.emit('error', { message: err.message || 'Failed to push question' });
      }
    });

    // Host manually reveals answer / ends question timer early
    // Event: 'host:reveal_answer' payload: { sessionId }
    socket.on('host:reveal_answer', async ({ sessionId }) => {
      try {
        const store = sessionStore.get(Number(sessionId)) || {};
        if (store.questionTimer) {
          clearTimeout(store.questionTimer);
          store.questionTimer = null;
        }

        const session = await Session.findByPk(sessionId, {
          include: [{ model: Quiz, as: 'quiz' }],
        });
        if (!session) return socket.emit('error', { message: 'Session not found' });

        const questions = await Question.findAll({
          where: { quiz_id: session.quiz_id },
          order: [['order_index', 'ASC'], ['id', 'ASC']],
        });
        const question = questions[session.current_question_index];
        if (!question) return socket.emit('error', { message: 'Question not found' });

        const options = await Option.findAll({ where: { question_id: question.id } });
        const correctOptions = options
          .filter((o) => o.is_correct)
          .map((o) => ({ id: o.id, text: o.text, media_url: o.media_url || null }));

        io.to(`session:${sessionId}`).emit('session:time_up', {
          questionId: question.id,
          votingClosed: true,
          correctOptions,
        });
        io.to(`session:${sessionId}`).emit('session:answer_revealed', {
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
        logger.info(`Host revealed answer early for session ${sessionId} question ${session.current_question_index + 1}`);
      } catch (err) {
        logger.error('host:reveal_answer error', err);
        socket.emit('error', { message: 'Failed to reveal answer' });
      }
    });

    // Host updates Auto-Reveal setting on the fly
    // Event: 'host:set_auto_reveal' payload: { sessionId, autoReveal }
    socket.on('host:set_auto_reveal', ({ sessionId, autoReveal }) => {
      const store = sessionStore.get(Number(sessionId)) || {};
      store.autoReveal = Boolean(autoReveal);
      sessionStore.set(Number(sessionId), store);
      logger.info(`Session ${sessionId} autoReveal set to ${store.autoReveal}`);
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

    // ─── OPEN Q&A & AUDIENCE LIVE POLL EVENTS ───────────────────────────

    // Host launches an open question to audience
    // Event: 'host:ask_open_question'
    socket.on('host:ask_open_question', async ({ sessionId, questionText, allowCustom = true, allowMultiple = true, maxSubmissions = 3, options = [], timeLimitSec = 0 }) => {
      try {
        const session = await Session.findByPk(sessionId);
        if (!session) return socket.emit('error', { message: 'Session not found' });

        if (session.status !== 'live') {
          await session.update({ status: 'live', started_at: session.started_at || new Date() });
        }

        const store = sessionStore.get(Number(sessionId)) || {};
        if (store.openQuestionTimer) clearTimeout(store.openQuestionTimer);

        const safeOptions = (options || []).map((o, idx) => ({
          id: o.id || String(idx + 1),
          text: o.text || o,
        }));

        const openQ = {
          id: 'open_' + Date.now(),
          text: (questionText || '').trim(),
          allowCustom: Boolean(allowCustom),
          allowMultiple: Boolean(allowMultiple),
          maxSubmissions: Number(maxSubmissions) || 3,
          options: safeOptions,
          timeLimitSec: Number(timeLimitSec) || 0,
          isOpen: true,
          startedAt: Date.now(),
          answers: new Map(), // participantId -> array of { text, optionId, timestamp }
          wordCounts: new Map(), // lowercase text -> { id, text, count, voters: Set, isOption, optionId }
          totalSubmissions: 0,
        };

        store.openQuestion = openQ;
        sessionStore.set(Number(sessionId), store);

        // Broadcast to all participants and host in session room
        const openQPayload = {
          id: openQ.id,
          text: openQ.text,
          allowCustom: openQ.allowCustom,
          allowMultiple: openQ.allowMultiple,
          maxSubmissions: openQ.maxSubmissions,
          options: openQ.options,
          timeLimitSec: openQ.timeLimitSec,
          isOpen: true,
        };
        io.to(`session:${sessionId}`).emit('session:open_question', openQPayload);
        io.to(`host:${sessionId}`).emit('session:open_question', openQPayload);

        // Auto close after time limit if set
        if (openQ.timeLimitSec > 0) {
          store.openQuestionTimer = setTimeout(() => {
            if (store.openQuestion && store.openQuestion.id === openQ.id) {
              store.openQuestion.isOpen = false;
              io.to(`session:${sessionId}`).emit('session:open_question_closed', { id: openQ.id });
              logger.info(`Session ${sessionId} open question timed out`);
            }
          }, openQ.timeLimitSec * 1000);
        }

        logger.info(`Session ${sessionId} open question launched: "${openQ.text}"`);
      } catch (err) {
        logger.error('host:ask_open_question error', err);
        socket.emit('error', { message: 'Failed to launch open question' });
      }
    });

    // Host manually closes voting on current open question
    socket.on('host:close_open_question', ({ sessionId }) => {
      const store = sessionStore.get(Number(sessionId));
      if (store && store.openQuestion) {
        if (store.openQuestionTimer) clearTimeout(store.openQuestionTimer);
        store.openQuestion.isOpen = false;
        io.to(`session:${sessionId}`).emit('session:open_question_closed', { id: store.openQuestion.id });
        logger.info(`Session ${sessionId} open question closed by host`);
      }
    });

    // Host resets/clears answers for the current open question
    socket.on('host:clear_open_question', ({ sessionId }) => {
      const store = sessionStore.get(Number(sessionId));
      if (store && store.openQuestion) {
        store.openQuestion.answers.clear();
        store.openQuestion.wordCounts.clear();
        store.openQuestion.totalSubmissions = 0;
        io.to(`session:${sessionId}`).emit('session:open_word_cloud_cleared', { questionId: store.openQuestion.id });
        logger.info(`Session ${sessionId} open question word cloud cleared`);
      }
    });

    // Host stops/dismisses the active open question (returns room to lobby/standby)
    socket.on('host:stop_open_question', ({ sessionId }) => {
      const store = sessionStore.get(Number(sessionId));
      if (store) {
        if (store.openQuestionTimer) clearTimeout(store.openQuestionTimer);
        store.openQuestion = null;
        io.to(`session:${sessionId}`).emit('session:open_question_stopped');
        logger.info(`Session ${sessionId} open question stopped/dismissed by host`);
      }
    });

    // Host ends the entire open poll session
    socket.on('host:end_open_poll', async ({ sessionId }) => {
      try {
        const store = sessionStore.get(Number(sessionId));
        if (store?.openQuestionTimer) clearTimeout(store.openQuestionTimer);

        const finalWords = store?.openQuestion
          ? Array.from(store.openQuestion.wordCounts.values()).map((w) => ({
              id: w.id,
              text: w.text,
              count: w.count,
              voters: Array.from(w.voters),
              isOption: w.isOption,
            })).sort((a, b) => b.count - a.count)
          : [];
        const totalSubs = store?.openQuestion?.totalSubmissions || 0;
        const totalParticipants = store?.openQuestion?.answers?.size || 0;

        sessionStore.delete(Number(sessionId));

        const session = await Session.findByPk(sessionId);
        if (session) {
          await session.update({ status: 'ended', ended_at: new Date() });
        }

        const pollEndPayload = {
          message: 'The Live Open Poll has ended. Thank you for participating!',
          totalSubmissions: totalSubs,
          totalParticipants,
          topWords: finalWords.slice(0, 5),
        };

        io.to(`session:${sessionId}`).emit('session:open_poll_ended', pollEndPayload);
        io.to(`host:${sessionId}`).emit('session:open_poll_ended', pollEndPayload);
        socket.emit('session:open_poll_ended', pollEndPayload);

        io.to(`session:${sessionId}`).emit('session:ended', {
          message: 'The Live Open Poll has ended.',
        });
        io.to(`host:${sessionId}`).emit('session:ended', {
          message: 'The Live Open Poll has ended.',
        });
        logger.info(`Session ${sessionId} open poll ended by host`);
      } catch (err) {
        logger.error('host:end_open_poll error', err);
        socket.emit('error', { message: 'Failed to end open poll' });
      }
    });

    // ─── PARTICIPANT EVENTS ─────────────────────────────────────────────

    // Participant joins the session via QR scan or PIN code
    // Event: 'participant:join'  payload: { sessionCode, nickname }
    socket.on('participant:join', async ({ sessionCode, nickname }) => {
      try {
        const cleanCode = (sessionCode || '').toString().trim().toUpperCase();
        const cleanNickname = (nickname || '').toString().trim();

        if (!cleanNickname || cleanNickname.length < 1 || cleanNickname.length > 30) {
          return socket.emit('error', { message: 'Nickname must be between 1 and 30 characters' });
        }
        if (!cleanCode) {
          return socket.emit('error', { message: 'Session PIN is required' });
        }

        const session = await Session.findOne({
          where: { code: cleanCode },
          include: [{ model: Quiz, as: 'quiz' }],
        });

        if (!session) {
          return socket.emit('error', { message: `Session with PIN "${cleanCode}" was not found.` });
        }
        if (session.status === 'ended') {
          return socket.emit('error', { message: 'This quiz has already ended.' });
        }

        // Check if participant already exists in this session (e.g. reconnecting)
        let participant = await Participant.findOne({
          where: { session_id: session.id, nickname: cleanNickname },
        });

        if (participant) {
          await participant.update({ socket_id: socket.id });
        } else {
          participant = await Participant.create({
            session_id: session.id,
            nickname: cleanNickname,
            socket_id: socket.id,
            joined_at: new Date(),
          });
        }

        socket.join(`session:${session.id}`);

        socket.emit('session:joined', {
          participantId: participant.id,
          sessionId: session.id,
          nickname: participant.nickname,
          quizTitle: session.quiz?.title || 'Live Quiz',
          status: session.status,
          currentQuestionIndex: session.current_question_index,
        });

        // If an open question is active, send it immediately to participant
        const store = sessionStore.get(session.id);
        if (store && store.openQuestion && store.openQuestion.isOpen) {
          const pAnswers = store.openQuestion.answers.get(participant.id) || [];
          socket.emit('session:open_question', {
            id: store.openQuestion.id,
            text: store.openQuestion.text,
            allowCustom: store.openQuestion.allowCustom,
            allowMultiple: store.openQuestion.allowMultiple,
            maxSubmissions: store.openQuestion.maxSubmissions,
            options: store.openQuestion.options,
            timeLimitSec: store.openQuestion.timeLimitSec,
            isOpen: store.openQuestion.isOpen,
            mySubmissions: pAnswers,
          });
        }

        // Notify host of new participant with their ID and initial score
        const count = await Participant.count({ where: { session_id: session.id } });
        const joinedPayload = {
          participantId: participant.id,
          nickname: cleanNickname,
          score: participant.score || 0,
          participantCount: count,
        };
        io.to(`session:${session.id}`).emit('session:participant_joined', joinedPayload);
        io.to(`host:${session.id}`).emit('session:participant_joined', joinedPayload);
        logger.info(`Participant "${cleanNickname}" joined session ${session.id} (PIN: ${cleanCode})`);
      } catch (err) {
        logger.error('participant:join error', err);
        socket.emit('error', { message: 'Failed to join session: ' + err.message });
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

        const newTotalScore = participant.score + pointsAwarded;
        socket.emit('answer:result', { isCorrect, pointsAwarded, totalScore: newTotalScore });

        const store = sessionStore.get(Number(sessionId)) || {};
        if (!store.currentAnswers) store.currentAnswers = new Map();
        store.currentAnswers.set(Number(participantId), {
          timeTakenMs,
          optionId: optionId || null,
          textAnswer: textAnswer || null,
          isCorrect,
          pointsAwarded,
        });
        sessionStore.set(Number(sessionId), store);

        // Notify host with participant details, live vote status, and updated score
        io.to(`host:${sessionId}`).emit('session:answer_received', {
          participantId: participant.id,
          nickname: participant.nickname,
          score: newTotalScore,
          optionId: optionId || null,
          textAnswer: textAnswer || null,
          isCorrect,
          pointsAwarded,
          timeTakenMs,
          answeredCount: store.currentAnswers.size,
        });

        // Notify participants room about overall voting progress
        io.to(`session:${sessionId}`).emit('session:vote_progress', {
          answeredCount: store.currentAnswers.size,
        });
        logger.info(`Participant ${participantId} ("${participant.nickname}") answered question ${questionId}`);
      } catch (err) {
        logger.error('participant:answer error', err);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    // Participant submits response to open question (fixed option or custom text)
    // Event: 'participant:open_answer'
    socket.on('participant:open_answer', async ({ sessionId, participantId, nickname, answerText, optionId }) => {
      try {
        const store = sessionStore.get(Number(sessionId));
        if (!store || !store.openQuestion) {
          return socket.emit('error', { message: 'No active open question found' });
        }
        const openQ = store.openQuestion;
        if (!openQ.isOpen) {
          return socket.emit('error', { message: 'Voting has been closed for this question' });
        }

        const pId = Number(participantId);
        const pAnswers = openQ.answers.get(pId) || [];

        // Check submission limits
        if (!openQ.allowMultiple && pAnswers.length >= 1) {
          return socket.emit('open_answer:limit_reached', { message: 'You have already submitted an answer' });
        }
        if (openQ.allowMultiple && pAnswers.length >= openQ.maxSubmissions) {
          return socket.emit('open_answer:limit_reached', { message: `Maximum limit of ${openQ.maxSubmissions} answers reached` });
        }

        const cleanText = (answerText || '').trim();
        if (!cleanText && !optionId) {
          return socket.emit('error', { message: 'Please enter or select an answer' });
        }

        let displayText = cleanText;
        let isOption = false;
        if (optionId) {
          const matchedOpt = openQ.options.find(o => String(o.id) === String(optionId));
          if (matchedOpt) {
            displayText = matchedOpt.text;
            isOption = true;
          }
        }

        // Record submission
        pAnswers.push({
          text: displayText,
          optionId: optionId || null,
          timestamp: Date.now(),
        });
        openQ.answers.set(pId, pAnswers);
        openQ.totalSubmissions += 1;

        // Group into wordCounts
        const key = displayText.toLowerCase();
        let wordEntry = openQ.wordCounts.get(key);
        if (!wordEntry) {
          wordEntry = {
            id: 'word_' + (openQ.wordCounts.size + 1),
            text: displayText,
            count: 0,
            voters: new Set(),
            isOption,
            optionId: optionId || null,
          };
          openQ.wordCounts.set(key, wordEntry);
        }
        wordEntry.count += 1;
        wordEntry.voters.add(nickname || `Player ${pId}`);

        // Broadcast updated cloud to everyone in the room
        const wordsArray = Array.from(openQ.wordCounts.values()).map(w => ({
          id: w.id,
          text: w.text,
          count: w.count,
          voters: Array.from(w.voters),
          isOption: w.isOption,
          optionId: w.optionId,
        })).sort((a, b) => b.count - a.count);

        io.to(`session:${sessionId}`).emit('session:open_word_cloud_update', {
          questionId: openQ.id,
          totalSubmissions: openQ.totalSubmissions,
          totalParticipants: openQ.answers.size,
          words: wordsArray,
          latestAnswer: {
            nickname: nickname || `Player ${pId}`,
            text: displayText,
            optionId: optionId || null,
          },
        });

        socket.emit('open_answer:accepted', {
          questionId: openQ.id,
          submittedCount: pAnswers.length,
          maxSubmissions: openQ.maxSubmissions,
          answerText: displayText,
          optionId: optionId || null,
        });

        logger.info(`Participant ${pId} ("${nickname}") submitted open answer: "${displayText}" in session ${sessionId}`);
      } catch (err) {
        logger.error('participant:open_answer error', err);
        socket.emit('error', { message: 'Failed to submit open answer' });
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
