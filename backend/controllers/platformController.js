const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const AccesoPlataforma = require('../models/AccesoPlataforma');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const Empresa = require('../models/Empresa');
const { registrarAcceso } = require('../services/accesoPlataformaService');
const { getClientIp, getUserAgent } = require('../utils/request');
const { ROLE_GROUPS } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET;
const IMPERSONATION_EXPIRES_IN = process.env.IMPERSONATION_JWT_EXPIRES_IN || '1h';
const TIPOS_PLATAFORMA = ROLE_GROUPS.PLATFORM;

const usuarioActivo = (usuario) =>
  usuario && usuario.activo !== false && usuario.activo !== 0;

const obtenerEmpresaDelUsuario = async (idUsuario) => {
  const usuarioEmpresa = await UsuarioEmpresa.findOne({
    where: { id_usuario: idUsuario, fecha_baja: null },
  });

  if (!usuarioEmpresa) {
    return { usuarioEmpresa: null, empresa: null };
  }

  const empresa = await Empresa.findOne({
    where: { id_empresa: usuarioEmpresa.id_empresa },
  });

  return { usuarioEmpresa, empresa };
};

const sanitizeUsuario = (usuario) => ({
  id_usuario: usuario.id_usuario,
  nombre: usuario.nombre,
  email: usuario.email,
  tipo_usuario: usuario.tipo_usuario,
  dni: usuario.dni,
  activo: usuario.activo,
});

const RUTAS_IGNORADAS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]);

const registrarNavegacion = async (req, res) => {
  const { ruta } = req.body;
  const path = String(ruta || '').trim();

  if (!path || path.length > 500) {
    return res.status(400).json({ message: 'Ruta no válida' });
  }

  if (RUTAS_IGNORADAS.has(path)) {
    return res.status(200).json({ ok: true, omitido: true });
  }

  try {
    await registrarAcceso({
      idUsuario: Number(req.user.id_usuario),
      tipoEvento: 'navegacion',
      ruta: path,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      idEmpresa: req.user.id_empresa ? Number(req.user.id_empresa) : null,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error en registrarNavegacion:', error.message);
    return res.status(500).json({ message: 'Error al registrar navegación' });
  }
};

const listarAccesos = async (req, res) => {
  const limite = Math.min(Math.max(Number(req.query.limite) || 100, 1), 500);
  const pagina = Math.max(Number(req.query.pagina) || 1, 1);
  const offset = (pagina - 1) * limite;
  const tipoEvento = req.query.tipo ? String(req.query.tipo).trim() : null;
  const busqueda = req.query.q ? String(req.query.q).trim() : null;

  try {
    const where = {};

    if (tipoEvento && ['login', 'navegacion', 'suplantacion'].includes(tipoEvento)) {
      where.tipo_evento = tipoEvento;
    }

    if (busqueda) {
      const usuarios = await Usuario.findAll({
        where: {
          [Op.or]: [
            { nombre: { [Op.like]: `%${busqueda}%` } },
            { email: { [Op.like]: `%${busqueda}%` } },
          ],
        },
        attributes: ['id_usuario'],
      });
      const ids = usuarios.map((u) => u.id_usuario);
      if (!ids.length) {
        return res.status(200).json({ accesos: [], total: 0, pagina, limite });
      }
      where.id_usuario = { [Op.in]: ids };
    }

    const { rows, count } = await AccesoPlataforma.findAndCountAll({
      where,
      order: [['fecha', 'DESC']],
      limit: limite,
      offset,
    });

    const userIds = [...new Set(rows.map((r) => r.id_usuario))];
    const usuarios = userIds.length
      ? await Usuario.findAll({
          where: { id_usuario: { [Op.in]: userIds } },
          attributes: ['id_usuario', 'nombre', 'email', 'tipo_usuario'],
        })
      : [];
    const usuariosPorId = Object.fromEntries(usuarios.map((u) => [u.id_usuario, u]));

    const accesos = rows.map((row) => {
      const usuario = usuariosPorId[row.id_usuario];
      return {
        id_acceso: row.id_acceso,
        id_usuario: row.id_usuario,
        nombre: usuario?.nombre || '—',
        email: usuario?.email || '—',
        tipo_usuario: usuario?.tipo_usuario ?? null,
        tipo_evento: row.tipo_evento,
        ruta: row.ruta,
        ip: row.ip,
        user_agent: row.user_agent,
        id_empresa: row.id_empresa,
        fecha: row.fecha,
      };
    });

    return res.status(200).json({
      accesos,
      total: count,
      pagina,
      limite,
    });
  } catch (error) {
    console.error('Error en listarAccesos:', error.message);
    return res.status(500).json({ message: 'Error al obtener accesos' });
  }
};

const accederComoUsuario = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: 'El correo es obligatorio' });
  }

  if (req.user.impersonacion) {
    return res.status(403).json({
      message: 'Cierra la sesión suplantada antes de acceder a otra cuenta',
    });
  }

  const adminTipo = Number(req.user.tipo_usuario);
  if (!TIPOS_PLATAFORMA.includes(adminTipo)) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const usuario = await Usuario.findOne({
      where: { email, fecha_baja: null },
    });

    if (!usuarioActivo(usuario)) {
      return res.status(404).json({ message: 'No existe un usuario activo con ese correo' });
    }

    const tipoDestino = Number(usuario.tipo_usuario);
    if (TIPOS_PLATAFORMA.includes(tipoDestino)) {
      return res.status(403).json({
        message: 'No se puede acceder a cuentas de administración de plataforma',
      });
    }

    const { usuarioEmpresa, empresa } = await obtenerEmpresaDelUsuario(usuario.id_usuario);
    if (!usuarioEmpresa) {
      return res.status(403).json({
        message: 'El usuario no está vinculado a ninguna empresa',
      });
    }

    let id_empresa = null;
    let nombre_empresa = null;
    let alias = null;

    if (empresa) {
      id_empresa = empresa.id_empresa;
      nombre_empresa = empresa.nombre;
      alias = empresa.alias;
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
        nombre: usuario.nombre,
        id_empresa,
        nombre_empresa,
        alias,
        esquema: id_empresa,
        impersonacion: true,
        impersonado_por: Number(req.user.id_usuario),
        impersonado_por_email: req.user.email,
        impersonado_por_nombre: req.user.nombre,
      },
      JWT_SECRET,
      { expiresIn: IMPERSONATION_EXPIRES_IN },
    );

    await registrarAcceso({
      idUsuario: Number(req.user.id_usuario),
      tipoEvento: 'suplantacion',
      ruta: `/platform/acceder:${usuario.email}`,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      idEmpresa: id_empresa,
    });

    return res.status(200).json({
      message: 'Acceso temporal generado',
      token,
      expiraEn: IMPERSONATION_EXPIRES_IN,
      usuario: sanitizeUsuario(usuario),
      empresa: id_empresa ? { id_empresa, nombre: nombre_empresa, alias } : null,
    });
  } catch (error) {
    console.error('Error en accederComoUsuario:', error.message);
    return res.status(500).json({ message: 'Error al generar el acceso temporal' });
  }
};

module.exports = {
  registrarNavegacion,
  listarAccesos,
  accederComoUsuario,
};
