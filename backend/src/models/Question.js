'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Question extends Model {}

Question.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    quiz_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'quizzes',
        key: 'id',
      },
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    type: {
      type: DataTypes.ENUM('mcq', 'true_false', 'short_answer', 'poll'),
      allowNull: false,
      defaultValue: 'mcq',
    },
    media_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },
    time_limit_sec: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      validate: {
        min: 5,
        max: 120,
      },
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    order_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Question',
    tableName: 'questions',
    timestamps: true,
  }
);

module.exports = Question;
