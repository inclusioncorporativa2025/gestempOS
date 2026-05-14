const { DataTypes } = require('sequelize');
const { sequelize  } = require('../config/db');
const Usuario = require('./Usuario');

const Empresa = sequelize.define('Empresa', {
    id_empresa: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    identificador_fiscal: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    fecha_alta: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    usuario_alta: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    fecha_baja: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_baja: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    licencias: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    fecha_modificacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_modificacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    alias: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'empresas',
    timestamps: false,
});

module.exports = Empresa;
