const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Usuario = require('./Usuario');
const Fichajes = require('./Fichajes');

const Peticiones = sequelize.define('Peticiones', {
    id_peticion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    id_usuario_peticion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
    id_usuario_gestor: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
    id_fichaje: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Fichajes,
            key: 'id_fichaje',
        },
    },
    nueva_entrada: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    nueva_salida: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    justificacion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    fecha_alta: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    fecha_aceptacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    fecha_cancelacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'peticiones',
    timestamps: false,
});

module.exports = Peticiones;
