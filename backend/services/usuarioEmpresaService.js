const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const Empresa = require('../models/Empresa');
const { normalizePlanId } = require('../config/plans');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRATION;
const PRE_AUTH_EXPIRES_IN = process.env.PRE_AUTH_JWT_EXPIRES_IN || '10m';

const TIPOS_PLATAFORMA = [1, 2];

const membresiaEstaActiva = (membresia) =>
  membresia &&
  !membresia.fecha_baja &&
  membresia.activo !== false &&
  membresia.activo !== 0;

const usuarioActivoPlataforma = (usuario) =>
  usuario &&
  !usuario.fecha_baja &&
  usuario.activo !== false &&
  usuario.activo !== 0;

const empresaEstaOperativa = (empresa) =>
  empresa &&
  !empresa.fecha_baja &&
  empresa.activo !== false &&
  empresa.activo !== 0;

const resolverTipoUsuario = (membresia, usuario) => {
  if (membresia?.tipo_usuario != null) {
    return Number(membresia.tipo_usuario);
  }
  return Number(usuario.tipo_usuario);
};

const resolverTipoSesion = (usuario, membresia) => {
  const tipoGlobal = Number(usuario.tipo_usuario);
  if (TIPOS_PLATAFORMA.includes(tipoGlobal)) {
    return tipoGlobal;
  }
  return resolverTipoUsuario(membresia, usuario);
};

const obtenerMembresiaActiva = async (idUsuario, idEmpresa) =>
  UsuarioEmpresa.findOne({
    where: {
      id_usuario: idUsuario,
      id_empresa: idEmpresa,
      fecha_baja: null,
    },
  });

const listarMembresiasActivas = async (idUsuario) => {
  const membresias = await UsuarioEmpresa.findAll({
    where: { id_usuario: idUsuario, fecha_baja: null, activo: true },
    order: [['fecha_alta', 'DESC']],
  });

  if (!membresias.length) {
    return [];
  }

  const empresas = await Empresa.findAll({
    where: {
      id_empresa: { [Op.in]: membresias.map((m) => m.id_empresa) },
    },
  });
  const empresaPorId = new Map(empresas.map((e) => [e.id_empresa, e]));

  return membresias
    .map((membresia) => ({
      membresia,
      empresa: empresaPorId.get(membresia.id_empresa) ?? null,
    }))
    .filter((item) => empresaEstaOperativa(item.empresa) && membresiaEstaActiva(item.membresia));
};

const usuarioPuedeAutenticarse = async (usuario) => {
  if (!usuario || usuario.fecha_baja) {
    return false;
  }

  if (TIPOS_PLATAFORMA.includes(Number(usuario.tipo_usuario))) {
    return usuarioActivoPlataforma(usuario);
  }

  const membresias = await listarMembresiasActivas(usuario.id_usuario);
  return membresias.length > 0;
};

const listarEmpresasParaSelector = async (idUsuario, usuario) =>
  listarMembresiasActivas(idUsuario).then((items) =>
    items.map(({ membresia, empresa }) => ({
      id_empresa: empresa.id_empresa,
      nombre: empresa.nombre,
      alias: empresa.alias,
      tipo_usuario: resolverTipoSesion(usuario, membresia),
    })),
  );

const usuarioTieneAccesoEmpresa = async (idUsuario, idEmpresa) => {
  const membresia = await obtenerMembresiaActiva(idUsuario, idEmpresa);
  if (!membresiaEstaActiva(membresia)) {
    return false;
  }
  const empresa = await Empresa.findByPk(idEmpresa);
  return empresaEstaOperativa(empresa);
};

const construirClaimsSesion = (usuario, empresa, membresia, extras = {}) => {
  const operativa = empresaEstaOperativa(empresa);
  const id_empresa = operativa ? empresa.id_empresa : null;
  const nombre_empresa = operativa ? empresa.nombre : null;
  const alias = operativa ? empresa.alias : null;
  const planCodigo = normalizePlanId(empresa?.plan);

  return {
    id_usuario: usuario.id_usuario,
    email: usuario.email,
    tipo_usuario: resolverTipoSesion(usuario, membresia),
    tipo_usuario_empresa: membresia ? resolverTipoUsuario(membresia, usuario) : null,
    nombre: usuario.nombre,
    id_empresa,
    nombre_empresa,
    alias,
    esquema: id_empresa,
    plan_id: operativa ? planCodigo : null,
    plan_row_id: operativa && empresa.id_plan ? Number(empresa.id_plan) : null,
    ...extras,
  };
};

const emitirJwtSesion = (usuario, empresa, membresia, extras = {}) =>
  jwt.sign(construirClaimsSesion(usuario, empresa, membresia, extras), JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

const emitirPreAuthToken = (idUsuario) =>
  jwt.sign(
    { id_usuario: idUsuario, purpose: 'empresa_selection' },
    JWT_SECRET,
    { expiresIn: PRE_AUTH_EXPIRES_IN },
  );

const verificarPreAuthToken = (token) => {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.purpose !== 'empresa_selection' || !payload.id_usuario) {
    throw new Error('Token de selección inválido');
  }
  return payload;
};

module.exports = {
  TIPOS_PLATAFORMA,
  membresiaEstaActiva,
  usuarioActivoPlataforma,
  usuarioPuedeAutenticarse,
  empresaEstaOperativa,
  resolverTipoUsuario,
  resolverTipoSesion,
  obtenerMembresiaActiva,
  listarMembresiasActivas,
  listarEmpresasParaSelector,
  usuarioTieneAccesoEmpresa,
  construirClaimsSesion,
  emitirJwtSesion,
  emitirPreAuthToken,
  verificarPreAuthToken,
};
