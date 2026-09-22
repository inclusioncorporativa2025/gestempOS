const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MarketplaceEmpresaModuloWhatsappUso = sequelize.define('MarketplaceEmpresaModuloWhatsappUso', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  id_empresa: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_modulo: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mes: {
    type: DataTypes.CHAR(7),
    allowNull: false,
  },
  mensajes_enviados: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  fecha_modificacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'marketplace_empresa_modulo_whatsapp_uso',
  timestamps: false,
});

module.exports = MarketplaceEmpresaModuloWhatsappUso;
