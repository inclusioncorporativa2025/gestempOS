const Usuario = require('../models/Usuario');
const UsuarioJornada = require('../models/UsuarioJornada');
const { createConId, createGlobalConId } = require('../utils/empresaScope');

const crearUsuarioRepo = async (nombre,email,fechaAlta,usuarioAlta,dni,tipoUsuario) => {

    try{
        const usuario = await createGlobalConId(Usuario, 'id_usuario', {
            nombre: nombre,
            email: email,
            fecha_alta: fechaAlta,
            usuario_alta : usuarioAlta,
            dni: dni,
            activo: true,
            tipo_usuario: tipoUsuario,
            requiere_reset_password: true,
        });
        return usuario;
    } catch (error){
        console.error(error);
        return error;
    }

};

const crearUsuarioHorario = async ( idUsuario,horario, idUsuarioAccion , idEmpresa)=>{

    const date = new Date();

    try{
        const usuarioHorario = await createConId(UsuarioJornada, idEmpresa, 'id_usuario_jornada', {
           id_usuario : idUsuario,
           id_jornada : horario,
           fecha_alta : date,
           usuario_alta: idUsuarioAccion,
        });
        return usuarioHorario;
    } catch (error){
        console.error(error);
        return error;
    }

};

module.exports = {
    crearUsuarioRepo,crearUsuarioHorario
};
