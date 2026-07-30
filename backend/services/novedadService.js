const { Op } = require('sequelize');
const NotificacionAppNovedad = require('../models/NotificacionAppNovedad');
const NotificacionAppNovedadVista = require('../models/NotificacionAppNovedadVista');
const { normalizePlanId } = require('../config/plans');
const { empresaTieneFeature } = require('./planService');
const { ROLES } = require('../middleware/authMiddleware');

const parseCsv = (value) => {
  if (value == null || String(value).trim() === '') return null;
  return String(value)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const mapNovedad = (row, extras = {}) => {
  if (!row) return null;
  const data = row.toJSON ? row.toJSON() : row;
  return {
    id_novedad: data.id_novedad,
    titulo: data.titulo,
    resumen: data.resumen,
    contenido: data.contenido,
    roles_permitidos: data.roles_permitidos,
    planes_permitidos: data.planes_permitidos,
    requiere_feature: data.requiere_feature,
    orden: data.orden,
    activo: Boolean(data.activo),
    fecha_publicacion: data.fecha_publicacion,
    vista: Boolean(extras.vista),
    fecha_vista: extras.fecha_vista || null,
  };
};

const novedadEsVisibleParaUsuario = async (novedad, contexto) => {
  const tipoUsuario = Number(contexto.tipoUsuario);
  const planId = contexto.planId ? normalizePlanId(contexto.planId) : null;
  const idEmpresa = contexto.idEmpresa ? Number(contexto.idEmpresa) : null;
  const esPlataforma = [ROLES.ROOT, ROLES.PLATFORM_ADMIN].includes(tipoUsuario);

  const rolesPermitidos = parseCsv(novedad.roles_permitidos);
  if (rolesPermitidos && !rolesPermitidos.includes(String(tipoUsuario))) {
    return false;
  }

  const planesPermitidos = parseCsv(novedad.planes_permitidos);
  if (planesPermitidos) {
    if (planId) {
      if (!planesPermitidos.includes(planId)) return false;
    } else if (!esPlataforma) {
      return false;
    }
  }

  if (novedad.requiere_feature) {
    if (!idEmpresa) return false;
    const tieneFeature = await empresaTieneFeature(idEmpresa, novedad.requiere_feature);
    if (!tieneFeature) return false;
  }

  return true;
};

const listarNovedadesActivas = async ({ incluirInactivas = false } = {}) => {
  const where = { fecha_baja: null };
  if (!incluirInactivas) where.activo = true;

  const rows = await NotificacionAppNovedad.findAll({
    where,
    order: [
      ['fecha_publicacion', 'DESC'],
      ['orden', 'DESC'],
      ['id_novedad', 'DESC'],
    ],
  });

  return rows.map((row) => mapNovedad(row));
};

const obtenerNovedadPorId = async (idNovedad, { incluirBaja = false } = {}) => {
  const where = { id_novedad: idNovedad };
  if (!incluirBaja) where.fecha_baja = null;

  const row = await NotificacionAppNovedad.findOne({ where });
  return mapNovedad(row);
};

const obtenerIdsVistasUsuario = async (idUsuario) => {
  const vistas = await NotificacionAppNovedadVista.findAll({
    where: { id_usuario: idUsuario },
    attributes: ['id_novedad', 'fecha_vista'],
  });

  const map = new Map();
  vistas.forEach((v) => {
    map.set(v.id_novedad, v.fecha_vista);
  });
  return map;
};

const filtrarNovedadesParaUsuario = async (novedades, contexto) => {
  const filtradas = [];
  for (const novedad of novedades) {
    // eslint-disable-next-line no-await-in-loop
    if (await novedadEsVisibleParaUsuario(novedad, contexto)) {
      filtradas.push(novedad);
    }
  }
  return filtradas;
};

const obtenerPendienteUsuario = async (contexto) => {
  const idUsuario = Number(contexto.idUsuario);
  const novedades = await listarNovedadesActivas();
  const vistas = await obtenerIdsVistasUsuario(idUsuario);
  const visibles = await filtrarNovedadesParaUsuario(novedades, contexto);

  const pendientes = visibles.filter((n) => !vistas.has(n.id_novedad));
  const ultima = pendientes[0] || null;

  return {
    novedad: ultima,
    pendientes: pendientes.length,
  };
};

const listarHistorialUsuario = async (contexto) => {
  const idUsuario = Number(contexto.idUsuario);
  const novedades = await listarNovedadesActivas();
  const vistas = await obtenerIdsVistasUsuario(idUsuario);
  const visibles = await filtrarNovedadesParaUsuario(novedades, contexto);

  return visibles.map((n) => mapNovedad(n, {
    vista: vistas.has(n.id_novedad),
    fecha_vista: vistas.get(n.id_novedad) || null,
  }));
};

const marcarNovedadVista = async (idUsuario, idNovedad) => {
  const novedad = await obtenerNovedadPorId(idNovedad);
  if (!novedad || !novedad.activo) {
    const error = new Error('Novedad no encontrada');
    error.status = 404;
    throw error;
  }

  const [vista] = await NotificacionAppNovedadVista.findOrCreate({
    where: { id_usuario: idUsuario, id_novedad: idNovedad },
    defaults: { id_usuario: idUsuario, id_novedad: idNovedad },
  });

  return vista;
};

const crearNovedad = async (datos, idUsuarioAccion) => {
  const titulo = String(datos.titulo || '').trim();
  const resumen = String(datos.resumen || '').trim();
  const contenido = String(datos.contenido || '').trim();

  if (!titulo || !resumen || !contenido) {
    const error = new Error('Título, resumen y contenido son obligatorios');
    error.status = 400;
    throw error;
  }

  const row = await NotificacionAppNovedad.create({
    titulo,
    resumen,
    contenido,
    roles_permitidos: datos.roles_permitidos || null,
    planes_permitidos: datos.planes_permitidos || null,
    requiere_feature: datos.requiere_feature || null,
    orden: Number(datos.orden) || 0,
    activo: datos.activo !== false,
    fecha_publicacion: datos.fecha_publicacion || new Date(),
    usuario_alta: idUsuarioAccion,
    fecha_alta: new Date(),
  });

  return mapNovedad(row);
};

const actualizarNovedad = async (idNovedad, datos, idUsuarioAccion) => {
  const row = await NotificacionAppNovedad.findOne({
    where: { id_novedad: idNovedad, fecha_baja: null },
  });

  if (!row) {
    const error = new Error('Novedad no encontrada');
    error.status = 404;
    throw error;
  }

  const titulo = datos.titulo != null ? String(datos.titulo).trim() : row.titulo;
  const resumen = datos.resumen != null ? String(datos.resumen).trim() : row.resumen;
  const contenido = datos.contenido != null ? String(datos.contenido).trim() : row.contenido;

  if (!titulo || !resumen || !contenido) {
    const error = new Error('Título, resumen y contenido son obligatorios');
    error.status = 400;
    throw error;
  }

  await row.update({
    titulo,
    resumen,
    contenido,
    roles_permitidos: datos.roles_permitidos !== undefined ? datos.roles_permitidos : row.roles_permitidos,
    planes_permitidos: datos.planes_permitidos !== undefined ? datos.planes_permitidos : row.planes_permitidos,
    requiere_feature: datos.requiere_feature !== undefined ? datos.requiere_feature : row.requiere_feature,
    orden: datos.orden !== undefined ? Number(datos.orden) || 0 : row.orden,
    activo: datos.activo !== undefined ? Boolean(datos.activo) : row.activo,
    fecha_publicacion: datos.fecha_publicacion || row.fecha_publicacion,
    usuario_modificacion: idUsuarioAccion,
    fecha_modificacion: new Date(),
  });

  return mapNovedad(row);
};

const bajaNovedad = async (idNovedad, idUsuarioAccion) => {
  const row = await NotificacionAppNovedad.findOne({
    where: { id_novedad: idNovedad, fecha_baja: null },
  });

  if (!row) {
    const error = new Error('Novedad no encontrada');
    error.status = 404;
    throw error;
  }

  await row.update({
    activo: false,
    fecha_baja: new Date(),
    usuario_baja: idUsuarioAccion,
  });

  return mapNovedad(row);
};

module.exports = {
  mapNovedad,
  listarNovedadesActivas,
  obtenerNovedadPorId,
  obtenerPendienteUsuario,
  listarHistorialUsuario,
  marcarNovedadVista,
  crearNovedad,
  actualizarNovedad,
  bajaNovedad,
  novedadEsVisibleParaUsuario,
};
