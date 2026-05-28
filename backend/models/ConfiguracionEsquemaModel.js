const { DataTypes } = require('sequelize');
const { sequelize  } = require('../config/db');

const ConfiguracionEsquema = sequelize.define('ConfiguracionEsquema', {
    id_configuracion_esquema: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    id_empresa: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'm_empresas',
            key: 'id_empresa',
        },
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
            model: 'm_usuarios',
            key: 'id_usuario',
        },
    },
    fecha_modificacion: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    usuario_modificacion: {
        type: DataTypes.INTEGER,
        references: {
            model: 'm_usuarios',
            key: 'id_usuario',
        },
    },
    usuario_baja: {
        type: DataTypes.INTEGER,
        references: {
            model: 'm_usuarios',
            key: 'id_usuario',
        },
    },
    fecha_baja: {
        type: DataTypes.DATE,
    },
}, {
    tableName: 'm_configuracion_esquema',
    timestamps: false,
});

module.exports = ConfiguracionEsquema;
