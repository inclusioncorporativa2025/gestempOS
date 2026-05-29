const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const UsuarioJornada = require('./UsuarioJornada');

const Usuario = sequelize.define('Usuario', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
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
    password_hash: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    tipo_usuario: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    dni: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    email_verificado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    requiere_reset_password: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    ultimo_login: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    reset_token_hash: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    reset_token_expira: {
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
}, {
    tableName: 'm_usuarios',
    timestamps: false,
});

module.exports = Usuario;
