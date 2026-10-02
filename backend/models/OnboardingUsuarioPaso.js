const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OnboardingUsuarioPaso = sequelize.define('OnboardingUsuarioPaso', {
  id_onboarding_usuario_paso: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_onboarding_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  codigo_paso: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  hecho: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  hecho_en: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  origen: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'auto',
  },
  fecha_alta: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fecha_modificacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'onboarding_usuario_paso',
  timestamps: false,
});

module.exports = OnboardingUsuarioPaso;
