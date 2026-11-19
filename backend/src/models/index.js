'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const User = require('./User');
const Quiz = require('./Quiz');
const Question = require('./Question');
const Option = require('./Option');
const Session = require('./Session');
const Participant = require('./Participant');
const Answer = require('./Answer');

// ── Associations ────────────────────────────────────────────────────────────

// User ↔ Quiz
User.hasMany(Quiz, { foreignKey: 'host_id', as: 'quizzes' });
Quiz.belongsTo(User, { foreignKey: 'host_id', as: 'host' });

// Quiz ↔ Question
Quiz.hasMany(Question, { foreignKey: 'quiz_id', as: 'questions', onDelete: 'CASCADE' });
Question.belongsTo(Quiz, { foreignKey: 'quiz_id' });

// Question ↔ Option
Question.hasMany(Option, { foreignKey: 'question_id', as: 'options', onDelete: 'CASCADE' });
Option.belongsTo(Question, { foreignKey: 'question_id' });

// Quiz ↔ Session
Quiz.hasMany(Session, { foreignKey: 'quiz_id', as: 'sessions' });
Session.belongsTo(Quiz, { foreignKey: 'quiz_id', as: 'quiz' });

// Session ↔ Participant
Session.hasMany(Participant, { foreignKey: 'session_id', as: 'participants', onDelete: 'CASCADE' });
Participant.belongsTo(Session, { foreignKey: 'session_id' });

// Participant ↔ Answer
Participant.hasMany(Answer, { foreignKey: 'participant_id', as: 'answers' });
Answer.belongsTo(Participant, { foreignKey: 'participant_id' });

// Answer → Question / Option
Answer.belongsTo(Question, { foreignKey: 'question_id' });
Answer.belongsTo(Option, { foreignKey: 'option_id' });

module.exports = {
  sequelize,
  Op,
  User,
  Quiz,
  Question,
  Option,
  Session,
  Participant,
  Answer,
};
