const { Op } = require('sequelize');
const CatalogoConvenio = require('../models/CatalogoConvenio');
const EmpresaConvenio = require('../models/EmpresaConvenio');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');

const mapCatalogo = (row) => {
  if (!row) return null;
  const data = row.toJSON ? row.toJSON() : row;
  return {
    ...data,
    dias_cupo_defecto: Number(data.dias_cupo_defecto),
    activo: Boolean(data.activo),
    excluir_festivos: Boolean(data.excluir_festivos),
    permite_medio_dia: Boolean(data.permite_medio_dia),
  };
};

const mapEmpresaConvenio = (row, catalogo = null) => {
  if (!row) return null;
  const data = row.toJSON ? row.toJSON() : row;
  const cat = catalogo || data.catalogo || data.CatalogoConvenio;
  const catalogoMap = cat ? mapCatalogo(cat) : null;
  return {
    id_empresa_convenio: data.id_empresa_convenio,
    id_empresa: data.id_empresa,
    id_convenio: data.id_convenio,
    nombre_visible: data.nombre_visible,
    activo: Boolean(data.activo),
    es_defecto: Boolean(data.es_defecto),
    nombre: data.nombre_visible || catalogoMap?.nombre || null,
    catalogo: catalogoMap,
    modo_conteo_vacaciones: catalogoMap?.modo_conteo_vacaciones || 'natural',
    dias_cupo_defecto: catalogoMap?.dias_cupo_defecto ?? 30,
    excluir_festivos: catalogoMap?.excluir_festivos ?? false,
    permite_medio_dia: catalogoMap?.permite_medio_dia ?? true,
  };
};

const reglasVacacionesDesdeConvenioResuelto = (resuelto) => {
  if (!resuelto?.catalogo) {
    return {
      modo_conteo_vacaciones: 'natural',
      dias_cupo_defecto: 30,
      excluir_festivos: false,
      permite_medio_dia: true,
      dias_semana_laborables: null,
    };
  }
  const cat = resuelto.catalogo;
  return {
    modo_conteo_vacaciones: cat.modo_conteo_vacaciones,
    dias_cupo_defecto: cat.dias_cupo_defecto,
    excluir_festivos: cat.excluir_festivos,
    permite_medio_dia: cat.permite_medio_dia,
    dias_semana_laborables: cat.dias_semana_laborables,
  };
};

const listarCatalogo = async ({ soloActivos = true } = {}) => {
  const where = { fecha_baja: null };
  if (soloActivos) where.activo = true;

  const rows = await CatalogoConvenio.findAll({
    where,
    order: [['orden', 'ASC'], ['nombre', 'ASC']],
  });
  return rows.map(mapCatalogo);
};

const obtenerCatalogoPorId = async (idConvenio) => {
  const row = await CatalogoConvenio.findOne({
    where: { id_convenio: idConvenio, fecha_baja: null },
  });
  return mapCatalogo(row);
};

const crearCatalogo = async (datos, idUsuarioAccion) => {
  const codigo = String(datos.codigo || '').trim();
  const nombre = String(datos.nombre || '').trim();
  if (!codigo || !nombre) {
    const error = new Error('Código y nombre son obligatorios');
    error.status = 400;
    throw error;
  }

  const row = await CatalogoConvenio.create({
    codigo,
    nombre,
    modo_conteo_vacaciones: datos.modo_conteo_vacaciones === 'laboral' ? 'laboral' : 'natural',
    dias_cupo_defecto: datos.dias_cupo_defecto ?? 30,
    excluir_festivos: Boolean(datos.excluir_festivos),
    permite_medio_dia: datos.permite_medio_dia !== false,
    horas_anuales: datos.horas_anuales ?? null,
    horas_semanales: datos.horas_semanales ?? null,
    dias_semana_laborables: datos.dias_semana_laborables ?? null,
    tipo_jornada: datos.tipo_jornada === 'parcial' ? 'parcial' : 'completa',
    descripcion: datos.descripcion ? String(datos.descripcion).trim() : null,
    orden: Number(datos.orden) || 0,
    activo: datos.activo !== false,
    usuario_alta: idUsuarioAccion,
    fecha_alta: new Date(),
  });
  return mapCatalogo(row);
};

const actualizarCatalogo = async (idConvenio, datos, idUsuarioAccion) => {
  const row = await CatalogoConvenio.findOne({
    where: { id_convenio: idConvenio, fecha_baja: null },
  });
  if (!row) {
    const error = new Error('Convenio no encontrado');
    error.status = 404;
    throw error;
  }

  const payload = {
    usuario_modificacion: idUsuarioAccion,
    fecha_modificacion: new Date(),
  };

  if (datos.codigo != null) payload.codigo = String(datos.codigo).trim();
  if (datos.nombre != null) payload.nombre = String(datos.nombre).trim();
  if (datos.modo_conteo_vacaciones != null) {
    payload.modo_conteo_vacaciones = datos.modo_conteo_vacaciones === 'laboral'
      ? 'laboral'
      : 'natural';
  }
  if (datos.dias_cupo_defecto != null) payload.dias_cupo_defecto = datos.dias_cupo_defecto;
  if (datos.excluir_festivos != null) payload.excluir_festivos = Boolean(datos.excluir_festivos);
  if (datos.permite_medio_dia != null) payload.permite_medio_dia = Boolean(datos.permite_medio_dia);
  if (datos.horas_anuales !== undefined) payload.horas_anuales = datos.horas_anuales;
  if (datos.horas_semanales !== undefined) payload.horas_semanales = datos.horas_semanales;
  if (datos.dias_semana_laborables !== undefined) {
    payload.dias_semana_laborables = datos.dias_semana_laborables;
  }
  if (datos.tipo_jornada != null) {
    payload.tipo_jornada = datos.tipo_jornada === 'parcial' ? 'parcial' : 'completa';
  }
  if (datos.descripcion !== undefined) {
    payload.descripcion = datos.descripcion ? String(datos.descripcion).trim() : null;
  }
  if (datos.orden != null) payload.orden = Number(datos.orden) || 0;
  if (datos.activo != null) payload.activo = Boolean(datos.activo);

  await row.update(payload);
  return mapCatalogo(row);
};

const bajaCatalogo = async (idConvenio, idUsuarioAccion) => {
  const row = await CatalogoConvenio.findOne({
    where: { id_convenio: idConvenio, fecha_baja: null },
  });
  if (!row) {
    const error = new Error('Convenio no encontrado');
    error.status = 404;
    throw error;
  }
  await row.update({
    activo: false,
    fecha_baja: new Date(),
    usuario_baja: idUsuarioAccion,
  });
  return mapCatalogo(row);
};

const listarEmpresaConvenios = async (idEmpresa, { soloActivos = false } = {}) => {
  const where = { id_empresa: idEmpresa, fecha_baja: null };
  if (soloActivos) where.activo = true;

  const rows = await EmpresaConvenio.findAll({
    where,
    include: [{
      model: CatalogoConvenio,
      required: true,
      where: { fecha_baja: null },
    }],
    order: [['es_defecto', 'DESC'], ['nombre_visible', 'ASC']],
  });

  return rows.map((row) => mapEmpresaConvenio(row, row.CatalogoConvenio));
};

const obtenerEmpresaConvenioPorId = async (idEmpresa, idEmpresaConvenio) => {
  const row = await EmpresaConvenio.findOne({
    where: {
      id_empresa_convenio: idEmpresaConvenio,
      id_empresa: idEmpresa,
      fecha_baja: null,
    },
    include: [{
      model: CatalogoConvenio,
      required: true,
      where: { fecha_baja: null },
    }],
  });
  return mapEmpresaConvenio(row, row?.CatalogoConvenio);
};

const incorporarConvenioEmpresa = async (
  idEmpresa,
  idConvenio,
  datos,
  idUsuarioAccion,
) => {
  const catalogo = await obtenerCatalogoPorId(idConvenio);
  if (!catalogo || !catalogo.activo) {
    const error = new Error('Convenio del catálogo no disponible');
    error.status = 404;
    throw error;
  }

  const existente = await EmpresaConvenio.findOne({
    where: { id_empresa: idEmpresa, id_convenio: idConvenio, fecha_baja: null },
  });
  if (existente) {
    const error = new Error('Este convenio ya está incorporado en la empresa');
    error.status = 409;
    error.code = 'CONVENIO_YA_INCORPORADO';
    throw error;
  }

  const marcarDefecto = Boolean(datos?.es_defecto);
  if (marcarDefecto) {
    await EmpresaConvenio.update(
      {
        es_defecto: false,
        usuario_modificacion: idUsuarioAccion,
        fecha_modificacion: new Date(),
      },
      {
        where: { id_empresa: idEmpresa, fecha_baja: null, es_defecto: true },
      },
    );
  }

  const row = await EmpresaConvenio.create({
    id_empresa: idEmpresa,
    id_convenio: idConvenio,
    nombre_visible: datos?.nombre_visible ? String(datos.nombre_visible).trim() : null,
    activo: datos?.activo !== false,
    es_defecto: marcarDefecto,
    usuario_alta: idUsuarioAccion,
    fecha_alta: new Date(),
  });

  return mapEmpresaConvenio(row, catalogo);
};

const actualizarEmpresaConvenio = async (
  idEmpresa,
  idEmpresaConvenio,
  datos,
  idUsuarioAccion,
) => {
  const row = await EmpresaConvenio.findOne({
    where: {
      id_empresa_convenio: idEmpresaConvenio,
      id_empresa: idEmpresa,
      fecha_baja: null,
    },
  });
  if (!row) {
    const error = new Error('Convenio de empresa no encontrado');
    error.status = 404;
    throw error;
  }

  if (datos?.es_defecto === true) {
    await EmpresaConvenio.update(
      {
        es_defecto: false,
        usuario_modificacion: idUsuarioAccion,
        fecha_modificacion: new Date(),
      },
      {
        where: {
          id_empresa: idEmpresa,
          fecha_baja: null,
          es_defecto: true,
          id_empresa_convenio: { [Op.ne]: idEmpresaConvenio },
        },
      },
    );
  }

  const payload = {
    usuario_modificacion: idUsuarioAccion,
    fecha_modificacion: new Date(),
  };
  if (datos?.nombre_visible !== undefined) {
    payload.nombre_visible = datos.nombre_visible
      ? String(datos.nombre_visible).trim()
      : null;
  }
  if (datos?.activo != null) payload.activo = Boolean(datos.activo);
  if (datos?.es_defecto != null) payload.es_defecto = Boolean(datos.es_defecto);

  await row.update(payload);
  return obtenerEmpresaConvenioPorId(idEmpresa, idEmpresaConvenio);
};

const bajaEmpresaConvenio = async (idEmpresa, idEmpresaConvenio, idUsuarioAccion) => {
  const row = await EmpresaConvenio.findOne({
    where: {
      id_empresa_convenio: idEmpresaConvenio,
      id_empresa: idEmpresa,
      fecha_baja: null,
    },
  });
  if (!row) {
    const error = new Error('Convenio de empresa no encontrado');
    error.status = 404;
    throw error;
  }

  await UsuarioEmpresa.update(
    { id_empresa_convenio: null },
    {
      where: {
        id_empresa: idEmpresa,
        id_empresa_convenio: idEmpresaConvenio,
        fecha_baja: null,
      },
    },
  );

  await row.update({
    activo: false,
    es_defecto: false,
    fecha_baja: new Date(),
    usuario_baja: idUsuarioAccion,
  });

  return mapEmpresaConvenio(row);
};

const obtenerDefectoEmpresa = async (idEmpresa) => {
  const row = await EmpresaConvenio.findOne({
    where: {
      id_empresa: idEmpresa,
      fecha_baja: null,
      activo: true,
      es_defecto: true,
    },
    include: [{
      model: CatalogoConvenio,
      required: true,
      where: { fecha_baja: null, activo: true },
    }],
  });
  return mapEmpresaConvenio(row, row?.CatalogoConvenio);
};

const resolverConvenioUsuario = async (idEmpresa, idUsuario) => {
  const membresia = await UsuarioEmpresa.findOne({
    where: { id_empresa: idEmpresa, id_usuario: idUsuario, fecha_baja: null },
    raw: true,
  });
  if (!membresia) return null;

  let empresaConvenio = null;
  if (membresia.id_empresa_convenio) {
    empresaConvenio = await obtenerEmpresaConvenioPorId(
      idEmpresa,
      membresia.id_empresa_convenio,
    );
  }
  if (!empresaConvenio || !empresaConvenio.activo) {
    empresaConvenio = await obtenerDefectoEmpresa(idEmpresa);
  }

  return {
    id_empresa_convenio: empresaConvenio?.id_empresa_convenio ?? null,
    empresa_convenio: empresaConvenio,
    reglas: reglasVacacionesDesdeConvenioResuelto(empresaConvenio),
    modo_conteo_etiqueta: empresaConvenio?.modo_conteo_vacaciones === 'laboral'
      ? 'días laborables'
      : 'días naturales',
  };
};

const validarAsignacionConvenio = async (idEmpresa, idEmpresaConvenio) => {
  if (idEmpresaConvenio == null || idEmpresaConvenio === '') {
    return null;
  }
  const convenio = await obtenerEmpresaConvenioPorId(idEmpresa, Number(idEmpresaConvenio));
  if (!convenio || !convenio.activo) {
    const error = new Error('Convenio no válido para esta empresa');
    error.status = 400;
    error.code = 'CONVENIO_INVALIDO';
    throw error;
  }
  return convenio.id_empresa_convenio;
};

const resolverIdEmpresaConvenioAlta = async (idEmpresa, idEmpresaConvenioExplicito) => {
  if (idEmpresaConvenioExplicito != null && idEmpresaConvenioExplicito !== '') {
    return validarAsignacionConvenio(idEmpresa, idEmpresaConvenioExplicito);
  }
  const defecto = await obtenerDefectoEmpresa(idEmpresa);
  return defecto?.id_empresa_convenio ?? null;
};

CatalogoConvenio.hasMany(EmpresaConvenio, { foreignKey: 'id_convenio' });
EmpresaConvenio.belongsTo(CatalogoConvenio, { foreignKey: 'id_convenio' });

module.exports = {
  mapCatalogo,
  mapEmpresaConvenio,
  listarCatalogo,
  obtenerCatalogoPorId,
  crearCatalogo,
  actualizarCatalogo,
  bajaCatalogo,
  listarEmpresaConvenios,
  obtenerEmpresaConvenioPorId,
  incorporarConvenioEmpresa,
  actualizarEmpresaConvenio,
  bajaEmpresaConvenio,
  obtenerDefectoEmpresa,
  resolverConvenioUsuario,
  validarAsignacionConvenio,
  resolverIdEmpresaConvenioAlta,
  reglasVacacionesDesdeConvenioResuelto,
};
