const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Empresa = sequelize.define('Empresa', {
  id_empresa: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  alias: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  identificador_fiscal: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  razon_social: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  nombre_comercial: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  telefono: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  web: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  codigo_postal: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  ciudad: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  provincia: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  pais: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'España',
  },
  sector: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  actividad: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  licencias: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  plan: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'esencial',
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  logo_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  color_principal: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  schema_origen: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  fecha_alta: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usuario_alta: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  fecha_modificacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usuario_modificacion: {
    type: DataTypes.INTEGER,
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
  tableName: 'm_empresas',
  timestamps: false,
});

module.exports = Empresa;
