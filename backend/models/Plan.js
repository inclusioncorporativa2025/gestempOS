const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Plan = sequelize.define('Plan', {
  id_plan: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  codigo: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  min_licencias: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  stripe_price_id_mensual: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  stripe_price_id_anual: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  features_json: {
    type: DataTypes.JSON,
    allowNull: true,
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
  tableName: 'planes',
  timestamps: false,
});

module.exports = Plan;
