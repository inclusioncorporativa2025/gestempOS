const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ausencia = sequelize.define('ausencia', {
  id_ausencia: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_desde: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  fecha_hasta: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  hora_ausencia_desde: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  hora_ausencia_hasta: {
    type: DataTypes.TIME,
    allowNull: true,
  },
  comentarios: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  usuario_alta: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_alta: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  usuario_baja: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fecha_baja: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  tipo: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
}, {
  tableName: 'ausencias',
  timestamps: false,
});

module.exports = Ausencia;
