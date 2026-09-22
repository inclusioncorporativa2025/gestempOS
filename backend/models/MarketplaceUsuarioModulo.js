const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MarketplaceUsuarioModulo = sequelize.define('MarketplaceUsuarioModulo', {
  id_usuario_modulo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_modulo: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  canal_email: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  canal_whatsapp: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  activado_por: {
    type: DataTypes.INTEGER,
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
  fecha_baja: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'marketplace_usuario_modulo',
  timestamps: false,
});

module.exports = MarketplaceUsuarioModulo;
