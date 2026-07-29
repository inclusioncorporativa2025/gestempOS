const { DataTypes } = require('sequelize');
const { sequelize  } = require('../config/db');
const Usuario = require('./Usuario');
const Empresa = require('./Empresa');

const UsuariosEmpresas = sequelize.define('UsuariosEmpresas', {
    id_usuario_empresa: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Usuario,
            key: 'id_usuario',
        },
    },
    id_empresa: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Empresa,
            key: 'id_empresa',
        },
    },
    tipo_usuario: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    tipo_hora: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    id_empresa_convenio: {
        type: DataTypes.INTEGER,
        allowNull: true,
        // En BD puede existir como id_convenio (legacy); apunta a empresa_convenios.id_empresa_convenio
        field: 'id_convenio',
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
}, {
    tableName: 'm_usuarios_empresas',
    timestamps: false,
});

module.exports = UsuariosEmpresas;
