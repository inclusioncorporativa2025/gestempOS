const {
  obtenerPendienteUsuario,
  listarHistorialUsuario,
  marcarNovedadVista,
  listarNovedadesActivas,
  crearNovedad,
  actualizarNovedad,
  bajaNovedad,
} = require('../services/novedadService');
const { normalizePlanId } = require('../config/plans');

const buildContexto = (req) => ({
  idUsuario: req.user?.id_usuario,
  tipoUsuario: req.user?.tipo_usuario,
  idEmpresa: req.user?.id_empresa,
  planId: normalizePlanId(req.user?.plan_id),
});

const getPendiente = async (req, res) => {
  try {
    const resultado = await obtenerPendienteUsuario(buildContexto(req));
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('novedad getPendiente:', error);
    return res.status(500).json({ message: 'Error al obtener novedad pendiente' });
  }
};

const getListar = async (req, res) => {
  try {
    const novedades = await listarHistorialUsuario(buildContexto(req));
    const pendientes = novedades.filter((n) => !n.vista).length;
    return res.status(200).json({ novedades, pendientes });
  } catch (error) {
    console.error('novedad getListar:', error);
    return res.status(500).json({ message: 'Error al listar novedades' });
  }
};

const postMarcarVista = async (req, res) => {
  const idNovedad = Number(req.body?.id_novedad);
  if (!idNovedad) {
    return res.status(400).json({ message: 'id_novedad es obligatorio' });
  }

  try {
    await marcarNovedadVista(Number(req.user.id_usuario), idNovedad);
    const resultado = await obtenerPendienteUsuario(buildContexto(req));
    return res.status(200).json({
      message: 'Novedad marcada como vista',
      ...resultado,
    });
  } catch (error) {
    console.error('novedad postMarcarVista:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al marcar novedad como vista',
    });
  }
};

const getAdminListar = async (req, res) => {
  try {
    const novedades = await listarNovedadesActivas({ incluirInactivas: true });
    return res.status(200).json({ novedades });
  } catch (error) {
    console.error('novedad getAdminListar:', error);
    return res.status(500).json({ message: 'Error al listar novedades' });
  }
};

const postAdminCrear = async (req, res) => {
  try {
    const novedad = await crearNovedad(req.body, req.user.id_usuario);
    return res.status(201).json({ novedad });
  } catch (error) {
    console.error('novedad postAdminCrear:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al crear novedad',
    });
  }
};

const postAdminActualizar = async (req, res) => {
  const idNovedad = Number(req.body?.id_novedad);
  if (!idNovedad) {
    return res.status(400).json({ message: 'id_novedad es obligatorio' });
  }

  try {
    const novedad = await actualizarNovedad(idNovedad, req.body, req.user.id_usuario);
    return res.status(200).json({ novedad });
  } catch (error) {
    console.error('novedad postAdminActualizar:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al actualizar novedad',
    });
  }
};

const postAdminBaja = async (req, res) => {
  const idNovedad = Number(req.body?.id_novedad);
  if (!idNovedad) {
    return res.status(400).json({ message: 'id_novedad es obligatorio' });
  }

  try {
    const novedad = await bajaNovedad(idNovedad, req.user.id_usuario);
    return res.status(200).json({ novedad });
  } catch (error) {
    console.error('novedad postAdminBaja:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al dar de baja la novedad',
    });
  }
};

module.exports = {
  getPendiente,
  getListar,
  postMarcarVista,
  getAdminListar,
  postAdminCrear,
  postAdminActualizar,
  postAdminBaja,
};
