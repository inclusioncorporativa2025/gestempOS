const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const NotificacionAppNovedadVista = sequelize.define('NotificacionAppNovedadVista', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_novedad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_vista: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notificaciones_app_novedades_vistas',
  timestamps: false,
});

module.exports = NotificacionAppNovedadVista;
