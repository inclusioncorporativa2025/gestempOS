const Empresa = require('../models/Empresa');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const { createGlobalConId } = require('../utils/empresaScope');

/**
 * Plazas de empleados (licencias contratadas).
 * El administrador de la empresa no consume licencia (se resta 1 del total de vínculos).
 */
const obtenerDisponibilidadLicencias = async (idEmpresa) => {
  try {
    const empresa = await Empresa.findOne({
      where: {
        id_empresa: idEmpresa,
        fecha_baja: null,
      },
    });

    if (!empresa) {
      return { disponible: false, licencias: 0, usadas: 0, plazasLibres: 0 };
    }

    const licencias = Number(empresa.licencias) || 0;
    const totalVinculos = await UsuarioEmpresa.count({
      where: {
        id_empresa: idEmpresa,
        fecha_baja: null,
      },
    });

    const usadas = Math.max(0, totalVinculos - 1);
    const plazasLibres = Math.max(0, licencias - usadas);

    return {
      disponible: plazasLibres > 0,
      licencias,
      usadas,
      plazasLibres,
    };
  } catch (error) {
    console.error('Error comprobando licencias:', error);
    return { disponible: false, licencias: 0, usadas: 0, plazasLibres: 0 };
  }
};

const validarCrearUsuario = async (idEmpresa) => {
  const { disponible } = await obtenerDisponibilidadLicencias(idEmpresa);
  return disponible;
};

const crearUsuarioEmpresa = async (id_usuario, id_empresa, idUsuarioAccion, fechaAlta) => {
  try {
    const usuarioEmpresa = await createGlobalConId(UsuarioEmpresa, 'id_usuario_empresa', {
      id_usuario: id_usuario,
      id_empresa: id_empresa,
      fecha_alta: fechaAlta,
      usuario_alta: idUsuarioAccion,
    });
    return usuarioEmpresa;
  } catch (error) {
    console.error(error);
    return error;
  }
};

module.exports = {
  crearUsuarioEmpresa,
  validarCrearUsuario,
  obtenerDisponibilidadLicencias,
};
