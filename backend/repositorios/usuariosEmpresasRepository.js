const Empresa = require('../models/Empresa');
const UsuarioEmpresa = require('../models/UsuarioEmpresa')

const validarCrearUsuario = async ( idEmpresa ) => {

  try{
    const result = await Empresa.findOne({
      where:{
        id_empresa : idEmpresa,
        fecha_baja : null,
      },
  });
   const licencias = result.dataValues.licencias;

  var licenciasUsadas = await UsuarioEmpresa.count({
    where: {
      id_empresa: idEmpresa,
      fecha_baja: null,
    },
  });
  licenciasUsadas = licenciasUsadas-1;

    return licencias>licenciasUsadas;
} catch (error){
    console.error(error);
}

};

const crearUsuarioEmpresa = async (id_usuario, id_empresa, idUsuarioAccion, fechaAlta) => {

  try{
    const usuarioEmpresa = await UsuarioEmpresa.create({
        id_usuario: id_usuario,
        id_empresa: id_empresa,
        fecha_alta: fechaAlta,
        usuario_alta : idUsuarioAccion,
    });
    return usuarioEmpresa;
} catch (error){
    console.error(error);
    return error;
}

};

module.exports = {
  crearUsuarioEmpresa,
  validarCrearUsuario
};
