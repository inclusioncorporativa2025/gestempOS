const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { serializarPared } = require('../utils/fechaMadrid');

const fechaPared = (campo) => ({
    type: DataTypes.DATE,
    allowNull: true,
    get() {
        return serializarPared(this.getDataValue(campo));
    },
});

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
    id_descanso: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    nueva_entrada: fechaPared('nueva_entrada'),
    nueva_salida: fechaPared('nueva_salida'),
    entrada_original: fechaPared('entrada_original'),
    salida_original: fechaPared('salida_original'),
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
    motivo_rechazo: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    notificacion_vista: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
}, {
    tableName: 'peticiones',
    timestamps: false,
});

module.exports = Peticiones;
