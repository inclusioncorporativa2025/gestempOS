const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AusenciaDocumento = sequelize.define('AusenciaDocumento', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_documento: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_ausencia: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  nombre_archivo: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  ruta_archivo: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'application/pdf',
  },
  tamano_bytes: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
  },
  hash_sha256: {
    type: DataTypes.CHAR(64),
    allowNull: true,
  },
  tipo_justificante: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  usuario_alta: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  tableName: 'usuarios_ausencias_documentos',
  timestamps: false,
});

module.exports = AusenciaDocumento;
