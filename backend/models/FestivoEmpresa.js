const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FestivoEmpresa = sequelize.define('festivos_empresa', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_festivo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  fecha: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  descripcion: {
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
  tableName: 'festivos_empresa',
  timestamps: false,
});

module.exports = FestivoEmpresa;
