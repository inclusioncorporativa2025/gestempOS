const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MarketplaceModulo = sequelize.define('MarketplaceModulo', {
  id_modulo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  codigo: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  feature_key: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  precio_mensual_eur: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  precio_anual_eur: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  stripe_price_id_mensual: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  stripe_price_id_anual: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  whatsapp_mensajes_mes_por_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },
  whatsapp_mensajes_mes_tope_empresa: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 500,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  fecha_alta: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fecha_baja: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'marketplace_modulos',
  timestamps: false,
});

module.exports = MarketplaceModulo;
