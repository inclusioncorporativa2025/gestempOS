const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MesesCierre = sequelize.define('MesesCierre', {
    empresa_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    id_mes_cierre: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    mes: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    usuario_aceptacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    fecha_aceptacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_cancelacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    fecha_cancelacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_alta: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    fecha_alta: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_baja: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    fecha_baja: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'meses_cierre',
    timestamps: false,
});

module.exports = MesesCierre;
