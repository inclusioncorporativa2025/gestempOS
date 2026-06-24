const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UsuarioVacacionesCupo = sequelize.define('UsuarioVacacionesCupo', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_cupo: {
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
  dias_asignados: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0,
  },
  dias_arrastre_entrada: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0,
  },
  dias_arrastre_salida: {
    type: DataTypes.DECIMAL(5, 1),
    allowNull: false,
    defaultValue: 0,
  },
  fecha_limite_disfrute: {
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
  tableName: 'usuarios_vacaciones_cupo',
  timestamps: false,
});

module.exports = UsuarioVacacionesCupo;
