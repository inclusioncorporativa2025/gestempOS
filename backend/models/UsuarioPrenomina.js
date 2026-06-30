const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UsuarioPrenomina = sequelize.define('UsuarioPrenomina', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_prenomina_empleado: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_prenomina: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  dias_trabajados: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: true,
  },
  dias_ausencia: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: true,
  },
  dias_vacaciones: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: true,
  },
  salario_base: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  importe_extras: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  importe_complementarias: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  otros_devengos: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  total_bruto_estimado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  moneda: {
    type: DataTypes.CHAR(3),
    allowNull: false,
    defaultValue: 'EUR',
  },
  id_retribucion: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  estado: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'ok',
  },
  snapshot_json: {
    type: DataTypes.JSON,
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
  tableName: 'usuarios_prenomina',
  timestamps: false,
});

module.exports = UsuarioPrenomina;
