const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UsuarioPrenominaLinea = sequelize.define('UsuarioPrenominaLinea', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_linea: {
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
  codigo_concepto: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'devengo',
  },
  cantidad: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
  },
  unidad: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  importe: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  origen: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'automatico',
  },
  orden: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: false,
    defaultValue: 0,
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
  tableName: 'usuarios_prenomina_lineas',
  timestamps: false,
});

module.exports = UsuarioPrenominaLinea;
