const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MarketplaceAlertasFichajeEnvio = sequelize.define('MarketplaceAlertasFichajeEnvio', {
  id: {
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
  fecha_dia: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  tipo_envio: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  canal: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  enviado_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  id_usuario_modulo: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'marketplace_alertas_fichaje_envios',
  timestamps: false,
});

module.exports = MarketplaceAlertasFichajeEnvio;
