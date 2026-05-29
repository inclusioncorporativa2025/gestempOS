const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Jornada = sequelize.define('jornadas', {
  empresa_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  id_jornada: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  tipo: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tipo_hora: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  column1: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    get() {
      const raw = this.getDataValue('column1');
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return raw;
      }
    },
    set(value) {
      if (value == null) {
        this.setDataValue('column1', null);
      } else {
        this.setDataValue('column1', typeof value === 'string' ? value : JSON.stringify(value));
      }
    },
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
  tableName: 'jornadas',
  timestamps: false,
});

module.exports = Jornada;
