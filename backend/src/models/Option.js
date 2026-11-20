'use strict';

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class Option extends Model {}

Option.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    question_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'questions',
        key: 'id',
      },
    },
    text: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: '',
    },
    media_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'Option',
    tableName: 'options',
    timestamps: true,
  }
);

module.exports = Option;
