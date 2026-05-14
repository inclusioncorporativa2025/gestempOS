const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const TipoAcceso = sequelize.define('TipoAcceso', {
  id_tipo_acceso: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fecha_alta: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  usuario_alta: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  tipo: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  tableName: 'tipo_acceso',
  timestamps: false,
});

module.exports = TipoAcceso;
