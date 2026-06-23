const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BolsaHorasMovimiento = sequelize.define('BolsaHorasMovimiento', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_movimiento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mes: {
    type: DataTypes.STRING(7),
    allowNull: true,
  },
  minutos: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tipo_movimiento: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'mes',
  },
  motivo: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  id_mes_cierre: {
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
    defaultValue: DataTypes.NOW,
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
  tableName: 'bolsa_horas_movimientos',
  timestamps: false,
});

module.exports = BolsaHorasMovimiento;
