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

const crearUsuarioEmpresa = async (id_usuario, id_empresa, idUsuarioAccion, fechaAlta, tipoUsuario) => {
  try {
    const existente = await UsuarioEmpresa.findOne({
      where: { id_usuario, id_empresa },
    });

    if (existente) {
      if (!existente.fecha_baja) {
        const error = new Error('El usuario ya pertenece a esta empresa');
        error.code = 'YA_EN_EMPRESA';
        throw error;
      }

      existente.fecha_baja = null;
      existente.usuario_baja = null;
      existente.fecha_alta = fechaAlta;
      existente.usuario_alta = idUsuarioAccion;
      existente.tipo_usuario = tipoUsuario;
      await existente.save();
      return existente;
    }

    const usuarioEmpresa = await createGlobalConId(UsuarioEmpresa, 'id_usuario_empresa', {
      id_usuario,
      id_empresa,
      tipo_usuario: tipoUsuario,
      fecha_alta: fechaAlta,
      usuario_alta: idUsuarioAccion,
    });
    return usuarioEmpresa;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

module.exports = {
  crearUsuarioEmpresa,
  validarCrearUsuario,
  obtenerDisponibilidadLicencias,
};
