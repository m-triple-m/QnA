'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Answer extends Model {}

Answer.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    participant_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'participants',
        key: 'id',
      },
    },
    question_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'questions',
        key: 'id',
      },
    },
    option_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'options',
        key: 'id',
      },
    },
    text_answer: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      defaultValue: null,
    },
    time_taken_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    points_awarded: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Answer',
    tableName: 'answers',
    timestamps: true,
  }
);

module.exports = Answer;
