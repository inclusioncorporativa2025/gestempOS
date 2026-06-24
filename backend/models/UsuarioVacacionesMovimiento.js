const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UsuarioVacacionesMovimiento = sequelize.define('UsuarioVacacionesMovimiento', {
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
  anio: {
    type: DataTypes.SMALLINT,
    allowNull: false,
  },
  dias: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
  },
  tipo_movimiento: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  fraccion_dia: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  fecha_disfrute: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  fecha_disfrute_hasta: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  id_ausencia: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  id_usuario_gestor: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  motivo: {
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
  fecha_baja: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  usuario_baja: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'usuarios_vacaciones_movimientos',
  timestamps: false,
});

module.exports = UsuarioVacacionesMovimiento;
