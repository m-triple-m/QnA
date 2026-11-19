'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Session extends Model {}

Session.init(
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
    code: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
    },
    qr_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('waiting', 'live', 'ended'),
      allowNull: false,
      defaultValue: 'waiting',
    },
    current_question_index: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    ended_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    modelName: 'Session',
    tableName: 'sessions',
    timestamps: true,
  }
);

module.exports = Session;
