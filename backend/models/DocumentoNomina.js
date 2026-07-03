const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DocumentoNomina = sequelize.define('DocumentoNomina', {
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
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  periodo_mes: {
    type: DataTypes.TINYINT.UNSIGNED,
    allowNull: false,
  },
  periodo_anio: {
    type: DataTypes.SMALLINT.UNSIGNED,
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
  importe_bruto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  importe_deducciones: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  importe_liquido: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  fecha_publicacion: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  visto_en: {
    type: DataTypes.DATE,
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
  tableName: 'usuarios_documentos_nomina',
  timestamps: false,
});

module.exports = DocumentoNomina;
