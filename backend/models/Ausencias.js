const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ausencia = sequelize.define('ausencia', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_ausencia: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_desde: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  fecha_hasta: {
    type: DataTypes.STRING(10),
    allowNull: true,
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
    allowNull: true,
  },
  fecha_alta: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usuario_baja: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fecha_baja: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  motivo_rechazo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fecha_aceptacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fecha_cancelacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  id_usuario_gestor: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  notificacion_vista: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  notificacion_gestor_vista: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  tipo: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  fraccion_dia: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
}, {
  tableName: 'ausencias',
  timestamps: false,
});

module.exports = Ausencia;
