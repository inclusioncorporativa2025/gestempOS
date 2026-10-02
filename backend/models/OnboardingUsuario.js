const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OnboardingUsuario = sequelize.define('OnboardingUsuario', {
  id_onboarding_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_usuario_empresa: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  plantilla: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'activo',
  },
  version: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false,
    defaultValue: 1,
  },
  cerrado_en: {
    type: DataTypes.DATE,
    allowNull: true,
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
  tableName: 'onboarding_usuario',
  timestamps: false,
});

module.exports = OnboardingUsuario;
