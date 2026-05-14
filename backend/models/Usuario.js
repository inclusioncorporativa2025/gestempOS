const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const UsuarioJornada = require('./UsuarioJornada');

const Usuario = sequelize.define('Usuario', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    fecha_alta: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    usuario_alta: {
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
    tipo_usuario: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    dni: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    fecha_modificacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_modificacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'usuarios',
    timestamps: false,
});

module.exports = Usuario;
