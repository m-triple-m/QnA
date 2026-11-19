'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Participant extends Model {}

Participant.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    session_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'sessions',
        key: 'id',
      },
    },
    nickname: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        len: [1, 30],
        notEmpty: true,
      },
    },
    socket_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Participant',
    tableName: 'participants',
    timestamps: true,
  }
);

module.exports = Participant;
