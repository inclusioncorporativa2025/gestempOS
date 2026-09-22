const { Op } = require('sequelize');
const dayjs = require('dayjs');
const MarketplaceModulo = require('../models/MarketplaceModulo');
const MarketplaceEmpresaModulo = require('../models/MarketplaceEmpresaModulo');
const MarketplaceUsuarioModulo = require('../models/MarketplaceUsuarioModulo');
const MarketplaceEmpresaModuloWhatsappUso = require('../models/MarketplaceEmpresaModuloWhatsappUso');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');

const ESTADOS_EMPRESA_ACTIVOS = ['active'];
const CODIGO_ALERTAS = 'alertas_fichaje';

const DEFAULT_CONFIG_ALERTAS = {
  minutos_gracia: 15,
  notificar_supervisor: true,
  recordatorio_minutos: null,
};

const normalizarCodigo = (codigo) => String(codigo || '').trim().toLowerCase();

const serializarModulo = (row) => {
  if (!row) return null;
  const plain = row.get ? row.get({ plain: true }) : row;
  return {
    id_modulo: plain.id_modulo,
    codigo: plain.codigo,
    nombre: plain.nombre,
    descripcion: plain.descripcion,
    feature_key: plain.feature_key,
    precio_mensual_eur: Number(plain.precio_mensual_eur),
    precio_anual_eur: plain.precio_anual_eur != null ? Number(plain.precio_anual_eur) : null,
    whatsapp_mensajes_mes_por_usuario: plain.whatsapp_mensajes_mes_por_usuario,
    whatsapp_mensajes_mes_tope_empresa: plain.whatsapp_mensajes_mes_tope_empresa,
    activo: plain.activo !== false && plain.activo !== 0,
  };
};

const serializarEmpresaModulo = (row, moduloRow) => ({
  id_empresa_modulo: row.id_empresa_modulo,
  id_empresa: row.id_empresa,
  id_modulo: row.id_modulo,
  codigo_modulo: moduloRow?.codigo ?? null,
  estado: row.estado,
  config_json: row.config_json ?? null,
  licencias_facturadas: row.licencias_facturadas,
  asientos_activos: null,
  fecha_alta: row.fecha_alta,
  fecha_baja: row.fecha_baja,
});

const obtenerModuloPorCodigo = async (codigo) => {
  const codigoNorm = normalizarCodigo(codigo);
  if (!codigoNorm) return null;

  const row = await MarketplaceModulo.findOne({
    where: {
      codigo: codigoNorm,
      activo: true,
      fecha_baja: null,
    },
  });

  return row;
};

const obtenerModuloPorId = async (idModulo) => {
  const id = Number(idModulo);
  if (!Number.isFinite(id) || id <= 0) return null;
  return MarketplaceModulo.findByPk(id);
};

const listarCatalogo = async () => {
  const rows = await MarketplaceModulo.findAll({
    where: { activo: true, fecha_baja: null },
    order: [['orden', 'ASC'], ['id_modulo', 'ASC']],
  });
  return rows.map(serializarModulo);
};

const obtenerEmpresaModuloRow = async (idEmpresa, idModulo) => (
  MarketplaceEmpresaModulo.findOne({
    where: {
      id_empresa: idEmpresa,
      id_modulo: idModulo,
      fecha_baja: null,
    },
  })
);

/** Incluye filas canceladas (fecha_baja) para reactivar sin violar uk (id_empresa, id_modulo). */
const obtenerEmpresaModuloRowHistorico = async (idEmpresa, idModulo) => (
  MarketplaceEmpresaModulo.findOne({
    where: {
      id_empresa: idEmpresa,
      id_modulo: idModulo,
    },
    order: [['id_empresa_modulo', 'DESC']],
  })
);

const empresaModuloEstaActivo = async (idEmpresa, codigoModulo) => {
  const modulo = await obtenerModuloPorCodigo(codigoModulo);
  if (!modulo) return false;

  const row = await obtenerEmpresaModuloRow(idEmpresa, modulo.id_modulo);
  if (!row) return false;

  return ESTADOS_EMPRESA_ACTIVOS.includes(String(row.estado).toLowerCase());
};

const contarAsientosActivos = async (idEmpresa, idModulo) => (
  MarketplaceUsuarioModulo.count({
    where: {
      id_empresa: idEmpresa,
      id_modulo: idModulo,
      activo: true,
      fecha_baja: null,
    },
  })
);

const listarEstadoEmpresa = async (idEmpresa) => {
  const catalogo = await listarCatalogo();
  const contratos = await MarketplaceEmpresaModulo.findAll({
    where: { id_empresa: idEmpresa, fecha_baja: null },
  });

  const contratoPorModulo = new Map(contratos.map((c) => [c.id_modulo, c]));

  const filas = await Promise.all(
    catalogo.map(async (modulo) => {
      const contrato = contratoPorModulo.get(modulo.id_modulo);
      if (!contrato) {
        return {
          modulo,
          contrato: null,
          asientos_activos: 0,
        };
      }

      const asientos = await contarAsientosActivos(idEmpresa, modulo.id_modulo);
      const contratoDto = serializarEmpresaModulo(contrato, modulo);
      contratoDto.asientos_activos = asientos;

      return {
        modulo,
        contrato: contratoDto,
        asientos_activos: asientos,
      };
    }),
  );

  return filas;
};

const activarModuloEmpresa = async ({
  idEmpresa,
  codigoModulo,
  configJson,
  idUsuarioAlta,
}) => {
  const modulo = await obtenerModuloPorCodigo(codigoModulo);
  if (!modulo) {
    const error = new Error('Módulo no encontrado en el catálogo');
    error.status = 404;
    throw error;
  }

  const config = {
    ...(codigoModulo === CODIGO_ALERTAS ? DEFAULT_CONFIG_ALERTAS : {}),
    ...(configJson && typeof configJson === 'object' ? configJson : {}),
  };

  const existente = await obtenerEmpresaModuloRowHistorico(idEmpresa, modulo.id_modulo);
  const ahora = new Date();

  if (existente) {
    await existente.update({
      estado: 'active',
      config_json: config,
      fecha_baja: null,
      fecha_modificacion: ahora,
      usuario_baja: null,
      usuario_alta: idUsuarioAlta ?? existente.usuario_alta,
    });
    return listarEstadoEmpresa(idEmpresa);
  }

  await MarketplaceEmpresaModulo.create({
    id_empresa: idEmpresa,
    id_modulo: modulo.id_modulo,
    estado: 'active',
    config_json: config,
    fecha_alta: ahora,
    usuario_alta: idUsuarioAlta ?? null,
  });

  return listarEstadoEmpresa(idEmpresa);
};

const cancelarModuloEmpresa = async ({
  idEmpresa,
  codigoModulo,
  idUsuarioBaja,
}) => {
  const modulo = await obtenerModuloPorCodigo(codigoModulo);
  if (!modulo) {
    const error = new Error('Módulo no encontrado');
    error.status = 404;
    throw error;
  }

  const row = await obtenerEmpresaModuloRow(idEmpresa, modulo.id_modulo);
  if (!row) {
    const error = new Error('La empresa no tiene contratado este módulo');
    error.status = 404;
    throw error;
  }

  const ahora = new Date();
  await row.update({
    estado: 'cancelled',
    fecha_baja: ahora,
    fecha_modificacion: ahora,
    usuario_baja: idUsuarioBaja ?? null,
  });

  await MarketplaceUsuarioModulo.update(
    { activo: false, fecha_modificacion: ahora },
    {
      where: {
        id_empresa: idEmpresa,
        id_modulo: modulo.id_modulo,
        fecha_baja: null,
      },
    },
  );

  return listarEstadoEmpresa(idEmpresa);
};

const assertEmpresaModuloActivo = async (idEmpresa, codigoModulo) => {
  const activo = await empresaModuloEstaActivo(idEmpresa, codigoModulo);
  if (!activo) {
    const error = new Error('Módulo no contratado o inactivo para esta empresa');
    error.status = 403;
    error.code = 'MARKETPLACE_MODULE_REQUIRED';
    error.modulo = normalizarCodigo(codigoModulo);
    throw error;
  }
};

const obtenerAsignacionUsuario = async (idEmpresa, idUsuario, idModulo) => (
  MarketplaceUsuarioModulo.findOne({
    where: {
      id_empresa: idEmpresa,
      id_usuario: idUsuario,
      id_modulo: idModulo,
      fecha_baja: null,
    },
  })
);

const usuarioTieneModulo = async (idEmpresa, idUsuario, codigoModulo) => {
  const modulo = await obtenerModuloPorCodigo(codigoModulo);
  if (!modulo) return false;

  const activoEmpresa = await empresaModuloEstaActivo(idEmpresa, codigoModulo);
  if (!activoEmpresa) return false;

  const asignacion = await obtenerAsignacionUsuario(idEmpresa, idUsuario, modulo.id_modulo);
  if (!asignacion) return false;

  return asignacion.activo === true || asignacion.activo === 1;
};

const assertUsuarioTieneModulo = async (idEmpresa, idUsuario, codigoModulo) => {
  await assertEmpresaModuloActivo(idEmpresa, codigoModulo);

  const tiene = await usuarioTieneModulo(idEmpresa, idUsuario, codigoModulo);
  if (!tiene) {
    const error = new Error('El usuario no tiene activo este módulo');
    error.status = 403;
    error.code = 'MARKETPLACE_USER_MODULE_REQUIRED';
    error.modulo = normalizarCodigo(codigoModulo);
    throw error;
  }
};

const listarAsignacionesModulo = async (idEmpresa, codigoModulo) => {
  const modulo = await obtenerModuloPorCodigo(codigoModulo);
  if (!modulo) {
    const error = new Error('Módulo no encontrado');
    error.status = 404;
    throw error;
  }

  await assertEmpresaModuloActivo(idEmpresa, codigoModulo);

  const membresias = await UsuarioEmpresa.findAll({
    where: {
      id_empresa: idEmpresa,
      fecha_baja: null,
      activo: true,
      tipo_usuario: { [Op.in]: [3, 4, 5] },
    },
  });

  if (!membresias.length) {
    return { modulo: serializarModulo(modulo), asignaciones: [] };
  }

  const ids = membresias.map((m) => m.id_usuario);
  const usuarios = await Usuario.findAll({
    where: { id_usuario: { [Op.in]: ids }, fecha_baja: null },
    attributes: ['id_usuario', 'nombre', 'email', 'telefono_whatsapp'],
  });
  const usuarioPorId = new Map(usuarios.map((u) => [u.id_usuario, u]));

  const asignacionesDb = await MarketplaceUsuarioModulo.findAll({
    where: {
      id_empresa: idEmpresa,
      id_modulo: modulo.id_modulo,
      fecha_baja: null,
    },
  });
  const asignacionPorUsuario = new Map(asignacionesDb.map((a) => [a.id_usuario, a]));

  const asignaciones = membresias
    .map((m) => {
      const usuario = usuarioPorId.get(m.id_usuario);
      if (!usuario) return null;
      const row = asignacionPorUsuario.get(m.id_usuario);
      return {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono_whatsapp: usuario.telefono_whatsapp,
        tipo_usuario: m.tipo_usuario,
        asignado: Boolean(row?.activo),
        canal_email: row ? row.canal_email !== false && row.canal_email !== 0 : true,
        canal_whatsapp: Boolean(row?.canal_whatsapp),
        id_usuario_modulo: row?.id_usuario_modulo ?? null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));

  return {
    modulo: serializarModulo(modulo),
    asignaciones,
  };
};

const guardarAsignacionUsuario = async ({
  idEmpresa,
  codigoModulo,
  idUsuario,
  asignado,
  canalEmail,
  canalWhatsapp,
  idUsuarioActor,
}) => {
  const modulo = await obtenerModuloPorCodigo(codigoModulo);
  if (!modulo) {
    const error = new Error('Módulo no encontrado');
    error.status = 404;
    throw error;
  }

  await assertEmpresaModuloActivo(idEmpresa, codigoModulo);

  const membresia = await UsuarioEmpresa.findOne({
    where: {
      id_empresa: idEmpresa,
      id_usuario: idUsuario,
      fecha_baja: null,
      activo: true,
    },
  });

  if (!membresia) {
    const error = new Error('El usuario no pertenece a esta empresa');
    error.status = 400;
    throw error;
  }

  const ahora = new Date();
  const activo = asignado === true || asignado === 1;
  const emailOn = canalEmail !== false && canalEmail !== 0;
  const waOn = canalWhatsapp === true || canalWhatsapp === 1;

  let row = await obtenerAsignacionUsuario(idEmpresa, idUsuario, modulo.id_modulo);

  if (row) {
    await row.update({
      activo,
      canal_email: activo ? emailOn : row.canal_email,
      canal_whatsapp: activo ? waOn : false,
      activado_por: idUsuarioActor ?? null,
      fecha_modificacion: ahora,
    });
  } else if (activo) {
    row = await MarketplaceUsuarioModulo.create({
      id_empresa: idEmpresa,
      id_usuario: idUsuario,
      id_modulo: modulo.id_modulo,
      activo: true,
      canal_email: emailOn,
      canal_whatsapp: waOn,
      activado_por: idUsuarioActor ?? null,
      fecha_alta: ahora,
    });
  }

  const asientos = await contarAsientosActivos(idEmpresa, modulo.id_modulo);
  await MarketplaceEmpresaModulo.update(
    { licencias_facturadas: asientos, fecha_modificacion: ahora },
    {
      where: {
        id_empresa: idEmpresa,
        id_modulo: modulo.id_modulo,
        fecha_baja: null,
      },
    },
  );

  return {
    id_usuario_modulo: row?.id_usuario_modulo ?? null,
    asientos_activos: asientos,
  };
};

const obtenerUsoWhatsappMes = async (idEmpresa, idModulo, mes) => {
  const mesNorm = dayjs(mes).format('YYYY-MM');
  const row = await MarketplaceEmpresaModuloWhatsappUso.findOne({
    where: { id_empresa: idEmpresa, id_modulo: idModulo, mes: mesNorm },
  });
  return row?.mensajes_enviados ?? 0;
};

const calcularCupoWhatsappEmpresa = async (idEmpresa, idModulo) => {
  const modulo = await obtenerModuloPorId(idModulo);
  if (!modulo) return { tope: 0, porUsuario: 0 };

  const usuariosWa = await MarketplaceUsuarioModulo.count({
    where: {
      id_empresa: idEmpresa,
      id_modulo: idModulo,
      activo: true,
      canal_whatsapp: true,
      fecha_baja: null,
    },
  });

  const porUsuario = Number(modulo.whatsapp_mensajes_mes_por_usuario) || 30;
  const topeEmpresa = Number(modulo.whatsapp_mensajes_mes_tope_empresa) || 500;
  const calculado = usuariosWa * porUsuario;

  return {
    tope: Math.min(topeEmpresa, calculado > 0 ? calculado : topeEmpresa),
    porUsuario,
    usuarios_whatsapp: usuariosWa,
  };
};

const puedeEnviarWhatsappAlerta = async (idEmpresa, idModulo) => {
  const cupo = await calcularCupoWhatsappEmpresa(idEmpresa, idModulo);
  const usados = await obtenerUsoWhatsappMes(idEmpresa, idModulo, dayjs());
  return usados < cupo.tope;
};

const incrementarUsoWhatsapp = async (idEmpresa, idModulo, incremento = 1) => {
  const mesNorm = dayjs().format('YYYY-MM');
  const existente = await MarketplaceEmpresaModuloWhatsappUso.findOne({
    where: { id_empresa: idEmpresa, id_modulo: idModulo, mes: mesNorm },
  });

  if (existente) {
    await existente.update({
      mensajes_enviados: Number(existente.mensajes_enviados) + incremento,
    });
    return existente.mensajes_enviados + incremento;
  }

  const creado = await MarketplaceEmpresaModuloWhatsappUso.create({
    id_empresa: idEmpresa,
    id_modulo: idModulo,
    mes: mesNorm,
    mensajes_enviados: incremento,
  });
  return creado.mensajes_enviados;
};

module.exports = {
  CODIGO_ALERTAS,
  DEFAULT_CONFIG_ALERTAS,
  listarCatalogo,
  listarEstadoEmpresa,
  obtenerModuloPorCodigo,
  empresaModuloEstaActivo,
  activarModuloEmpresa,
  cancelarModuloEmpresa,
  assertEmpresaModuloActivo,
  assertUsuarioTieneModulo,
  usuarioTieneModulo,
  listarAsignacionesModulo,
  guardarAsignacionUsuario,
  contarAsientosActivos,
  puedeEnviarWhatsappAlerta,
  incrementarUsoWhatsapp,
  calcularCupoWhatsappEmpresa,
  obtenerUsoWhatsappMes,
};
