const Usuario = require('../models/Usuario');
const UsuarioJornada = require('../models/UsuarioJornada');

const crearUsuarioRepo = async (nombre,email,fechaAlta,usuarioAlta,dni,tipoUsuario) => {

    try{
        const usuario = await Usuario.create({
            nombre: nombre,
            email: email,
            fecha_alta: fechaAlta,
            usuario_alta : usuarioAlta,
            tipo_usuario : 5,
            dni: dni,
            activo: true,
            tipo_usuario: tipoUsuario
        });
        return usuario;
    } catch (error){
        console.error(error);
        return error;
    }

};

const crearUsuarioHorario = async ( idUsuario,horario, idUsuarioAccion , idEmpresa)=>{

    const esquema = 'empresa'+idEmpresa;
    const date = new Date();

    try{
        const usuarioHorario = await UsuarioJornada.schema(esquema).create({
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
