const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EmpresaPrenomina = sequelize.define('EmpresaPrenomina', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_prenomina: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  periodo_mes: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: false,
  },
  periodo_anio: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false,
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'borrador',
  },
  fecha_generacion: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  usuario_generacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_cierre: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usuario_cierre: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  observaciones: {
    type: DataTypes.STRING(500),
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
  usuario_modificacion: {
    type: DataTypes.INTEGER,
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
  usuario_baja: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'empresa_prenominas',
  timestamps: false,
});

module.exports = EmpresaPrenomina;
