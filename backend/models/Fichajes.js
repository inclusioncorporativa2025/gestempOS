const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Fichajes = sequelize.define('Fichajes', {
    empresa_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    id_fichaje: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    fecha_entrada: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    fecha_salida: {
        type: DataTypes.DATE,
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
    ubicacion_entrada: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    ubicacion_salida: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    descanso: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'fichajes',
    timestamps: false,
});

module.exports = Fichajes;
