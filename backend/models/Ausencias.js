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
  tipo: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
}, {
  tableName: 'ausencias',
  timestamps: false,
});

module.exports = Ausencia;
