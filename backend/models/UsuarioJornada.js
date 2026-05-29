const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UsuarioJornada = sequelize.define('usuario_jornada', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_usuario_jornada: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_jornada: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_alta: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usuario_alta: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fecha_modificacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usuario_modificacion: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fecha_baja: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usuario_baja: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'usuario_jornada',
  timestamps: false,
});

module.exports = UsuarioJornada;
