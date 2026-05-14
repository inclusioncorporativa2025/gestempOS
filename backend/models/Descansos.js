const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Usuario = require('./Usuario');

const Descansos = sequelize.define('Descansos', {
    id_descanso: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
    fecha_entrada: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    fecha_salida: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    ubicacion_entrada: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ubicacion_salida: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    fecha_alta: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    usuario_alta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
    fecha_modificacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_modificacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
    fecha_baja: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_baja: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
}, {
    tableName: 'descansos',
    timestamps: false,
});

module.exports = Descansos;
