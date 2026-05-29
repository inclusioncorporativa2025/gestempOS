const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Peticiones = sequelize.define('Peticiones', {
    empresa_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    id_peticion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    id_usuario_peticion: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    id_usuario_gestor: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    id_fichaje: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    nueva_entrada: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    nueva_salida: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    justificacion: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    fecha_alta: {
        type: DataTypes.DATE,
        allowNull: true,
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
