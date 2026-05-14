const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Usuario = require('./Usuario');

const MesesCierre = sequelize.define('MesesCierre', {
    id_mes_cierre: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    mes: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    usuario_aceptacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
    fecha_aceptacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_cancelacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
    fecha_cancelacion: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    usuario_alta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
    fecha_alta: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    usuario_baja: {
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
}, {
    tableName: 'meses_cierre',
    timestamps: false,
});

module.exports = MesesCierre;
