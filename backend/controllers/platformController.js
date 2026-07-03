const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const AccesoPlataforma = require('../models/AccesoPlataforma');
const Usuario = require('../models/Usuario');
const { registrarAcceso } = require('../services/accesoPlataformaService');
const { getClientIp, getUserAgent } = require('../utils/request');
const { ROLE_GROUPS } = require('../middleware/authMiddleware');
const {
  listarMembresiasActivas,
  construirClaimsSesion,
  usuarioPuedeAutenticarse,
  membresiaEstaActiva,
} = require('../services/usuarioEmpresaService');

const IMPERSONATION_EXPIRES_IN = process.env.IMPERSONATION_JWT_EXPIRES_IN || '1h';
const TIPOS_PLATAFORMA = ROLE_GROUPS.PLATFORM;
const MAX_ACCESOS_UI = 3000;

const sanitizeUsuario = (usuario, membresia = null) => ({
  id_usuario: usuario.id_usuario,
  nombre: usuario.nombre,
  email: usuario.email,
  tipo_usuario: usuario.tipo_usuario,
  dni: usuario.dni,
  activo: membresia != null
    ? membresiaEstaActiva(membresia)
    : usuario.activo !== false && usuario.activo !== 0,
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

  const responderAccesos = (accesos, total, truncado = false) => res.status(200).json({
    accesos,
    total,
    pagina,
    limite,
    max_ui: MAX_ACCESOS_UI,
    truncado,
  });

  const contarAccesosUi = async (where) => {
    const muestras = await AccesoPlataforma.findAll({
      where,
      attributes: ['id_acceso'],
      order: [['fecha', 'DESC']],
      limit: MAX_ACCESOS_UI + 1,
      raw: true,
    });
    return {
      total: Math.min(muestras.length, MAX_ACCESOS_UI),
      truncado: muestras.length > MAX_ACCESOS_UI,
    };
  };

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
        return responderAccesos([], 0);
      }
      where.id_usuario = { [Op.in]: ids };
    }

    if (offset >= MAX_ACCESOS_UI) {
      return responderAccesos([], MAX_ACCESOS_UI, true);
    }

    const limiteEfectivo = Math.min(limite, MAX_ACCESOS_UI - offset);

    const [rows, conteo] = await Promise.all([
      AccesoPlataforma.findAll({
        where,
        order: [['fecha', 'DESC']],
        limit: limiteEfectivo,
        offset,
      }),
      contarAccesosUi(where),
    ]);

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

    return responderAccesos(accesos, conteo.total, conteo.truncado);
  } catch (error) {
    console.error('Error en listarAccesos:', error.message);
    return res.status(500).json({ message: 'Error al obtener accesos' });
  }
};

const accederComoUsuario = async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const idEmpresaSolicitada = req.body?.id_empresa != null
    ? Number(req.body.id_empresa)
    : null;

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

    if (!(await usuarioPuedeAutenticarse(usuario))) {
      return res.status(404).json({ message: 'No existe un usuario activo con ese correo' });
    }

    const tipoDestino = Number(usuario.tipo_usuario);
    if (TIPOS_PLATAFORMA.includes(tipoDestino)) {
      return res.status(403).json({
        message: 'No se puede acceder a cuentas de administración de plataforma',
      });
    }

    const membresiasActivas = await listarMembresiasActivas(usuario.id_usuario);
    if (!membresiasActivas.length) {
      return res.status(403).json({
        message: 'El usuario no está vinculado a ninguna empresa',
      });
    }

    let seleccion = membresiasActivas[0];
    if (idEmpresaSolicitada) {
      const encontrada = membresiasActivas.find(
        (item) => item.empresa.id_empresa === idEmpresaSolicitada,
      );
      if (!encontrada) {
        return res.status(403).json({ message: 'El usuario no pertenece a esa empresa' });
      }
      seleccion = encontrada;
    } else if (membresiasActivas.length > 1) {
      return res.status(200).json({
        code: 'EMPRESA_SELECTION_REQUIRED',
        message: 'El usuario pertenece a varias empresas. Indica id_empresa.',
        empresas: membresiasActivas.map(({ empresa, membresia }) => ({
          id_empresa: empresa.id_empresa,
          nombre: empresa.nombre,
          alias: empresa.alias,
          tipo_usuario: membresia.tipo_usuario ?? usuario.tipo_usuario,
        })),
      });
    }

    const { membresia, empresa } = seleccion;
    const id_empresa = empresa.id_empresa;

    const token = jwt.sign(
      construirClaimsSesion(usuario, empresa, membresia, {
        impersonacion: true,
        impersonado_por: Number(req.user.id_usuario),
        impersonado_por_email: req.user.email,
        impersonado_por_nombre: req.user.nombre,
      }),
      process.env.JWT_SECRET,
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
      empresa: { id_empresa, nombre: empresa.nombre, alias: empresa.alias },
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
