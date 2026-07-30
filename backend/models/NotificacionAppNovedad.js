const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const NotificacionAppNovedad = sequelize.define('NotificacionAppNovedad', {
  id_novedad: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  codigo: {
    type: DataTypes.STRING(40),
    allowNull: false,
  },
  titulo: {
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  resumen: {
    type: DataTypes.STRING(300),
    allowNull: false,
  },
  contenido: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  roles_permitidos: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  planes_permitidos: {
    type: DataTypes.STRING(60),
    allowNull: true,
  },
  requiere_feature: {
    type: DataTypes.STRING(40),
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
  fecha_publicacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
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
  tableName: 'notificaciones_app_novedades',
  timestamps: false,
});

module.exports = NotificacionAppNovedad;
