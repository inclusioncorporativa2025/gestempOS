const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CatalogoConvenio = sequelize.define('CatalogoConvenio', {
  id_convenio: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  codigo: {
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  modo_conteo_vacaciones: {
    type: DataTypes.ENUM('natural', 'laboral'),
    allowNull: false,
    defaultValue: 'natural',
  },
  dias_cupo_defecto: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 30,
  },
  excluir_festivos: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  permite_medio_dia: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  horas_anuales: {
    type: DataTypes.SMALLINT,
    allowNull: true,
  },
  horas_semanales: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true,
  },
  dias_semana_laborables: {
    type: DataTypes.TINYINT,
    allowNull: true,
  },
  tipo_jornada: {
    type: DataTypes.ENUM('completa', 'parcial'),
    allowNull: false,
    defaultValue: 'completa',
  },
  descripcion: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  orden: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    defaultValue: 0,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
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
  tableName: 'catalogo_convenios',
  timestamps: false,
});

module.exports = CatalogoConvenio;
