const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EmpresaConvenio = sequelize.define('EmpresaConvenio', {
  id_empresa_convenio: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_convenio: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  nombre_visible: {
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  es_defecto: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
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
  tableName: 'empresa_convenios',
  timestamps: false,
});

module.exports = EmpresaConvenio;
