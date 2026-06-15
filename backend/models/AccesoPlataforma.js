const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AccesoPlataforma = sequelize.define(
  'AccesoPlataforma',
  {
    id_acceso: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    id_usuario: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tipo_evento: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    ruta: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.STRING(512),
      allowNull: true,
    },
    id_empresa: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'm_accesos_plataforma',
    timestamps: false,
  },
);

module.exports = AccesoPlataforma;
