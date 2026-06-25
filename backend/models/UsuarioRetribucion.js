const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UsuarioRetribucion = sequelize.define('UsuarioRetribucion', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_retribucion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  salario_bruto_mensual: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  moneda: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'EUR',
  },
  fecha_desde: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fecha_hasta: {
    type: DataTypes.DATEONLY,
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
  tableName: 'usuarios_retribucion',
  timestamps: false,
});

module.exports = UsuarioRetribucion;
