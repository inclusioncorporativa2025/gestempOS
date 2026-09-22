const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MarketplaceEmpresaModulo = sequelize.define('MarketplaceEmpresaModulo', {
  id_empresa_modulo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_modulo: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending',
  },
  config_json: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  stripe_subscription_item_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  licencias_facturadas: {
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
  usuario_alta: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  usuario_baja: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'marketplace_empresa_modulo',
  timestamps: false,
});

module.exports = MarketplaceEmpresaModulo;
