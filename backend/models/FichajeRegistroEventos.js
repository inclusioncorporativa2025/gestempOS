const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FichajeRegistroEventos = sequelize.define('FichajeRegistroEventos', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_evento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  hora: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  ubicacion: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: '',
  },
  observaciones: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: '',
  },
  hash: {
    type: DataTypes.CHAR(64),
    allowNull: false,
  },
  id_fichaje: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  id_descanso: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  usuario_alta: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fecha_alta: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'fichaje_registro_eventos',
  timestamps: false,
});

module.exports = FichajeRegistroEventos;
