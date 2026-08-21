const {
  obtenerClaimsHub,
  listarVentas,
  listarComerciales,
  crearInvitacionRegistro,
  asignarVentaManual,
  obtenerInvitacionPreview,
  crmTablasDisponibles,
} = require('../services/crmHubService');

const APP_PUBLIC_URL = (
  process.env.APP_PUBLIC_URL ||
  process.env.FRONTEND_URL ||
  'https://app.timecor.es'
).replace(/\/$/, '');

const obtenerContexto = async (req, res) => {
  try {
    const claims = await obtenerClaimsHub({ id_usuario: req.user.id_usuario, tipo_usuario: req.user.tipo_usuario });
    return res.status(200).json({
      hub_acceso: Boolean(claims.hub_acceso),
      hub_puestos: claims.hub_puestos || [],
      hub_permisos: claims.hub_permisos || [],
      tablas_disponibles: await crmTablasDisponibles(),
    });
  } catch (error) {
    console.error('[hub] obtenerContexto:', error.message);
    return res.status(500).json({ message: 'Error al cargar contexto del hub' });
  }
};

const listarVentasHandler = async (req, res) => {
  try {
    const data = await listarVentas(req.user, {
      q: req.query.q,
      etapa: req.query.etapa,
      pagina: Number(req.query.pagina) || 1,
      limite: Number(req.query.limite) || 50,
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('[hub] listarVentas:', error.message);
    return res.status(500).json({ message: 'Error al listar ventas del hub' });
  }
};

const listarComercialesHandler = async (_req, res) => {
  try {
    const comerciales = await listarComerciales();
    return res.status(200).json({ comerciales });
  } catch (error) {
    console.error('[hub] listarComerciales:', error.message);
    return res.status(500).json({ message: 'Error al listar comerciales' });
  }
};

const crearInvitacionHandler = async (req, res) => {
  try {
    const {
      email_previsto: emailPrevisto,
      telefono_previsto: telefonoPrevisto,
      canal = 'telefono',
      dias_validez: diasValidez,
    } = req.body || {};

    const invitacion = await crearInvitacionRegistro({
      idUsuarioComercial: Number(req.user.id_usuario),
      emailPrevisto,
      telefonoPrevisto,
      canal,
      diasValidez: diasValidez || 30,
    });

    const registerUrl = `${APP_PUBLIC_URL}/register?inv=${encodeURIComponent(invitacion.token)}`;

    return res.status(201).json({
      message: 'Invitación creada',
      id_invitacion: invitacion.id_invitacion,
      codigo_corto: invitacion.codigo_corto,
      register_url: registerUrl,
      fecha_expiracion: invitacion.fecha_expiracion,
    });
  } catch (error) {
    console.error('[hub] crearInvitacion:', error.message);
    return res.status(500).json({ message: 'Error al crear la invitación' });
  }
};

const asignarVentaHandler = async (req, res) => {
  try {
    const idEmpresa = Number(req.body?.id_empresa);
    const idComercial = Number(req.body?.id_usuario_comercial);
    const { notas, canal = 'manual' } = req.body || {};

    if (!idEmpresa || !idComercial) {
      return res.status(400).json({ message: 'id_empresa e id_usuario_comercial son obligatorios' });
    }

    const idVenta = await asignarVentaManual({
      idEmpresa,
      idUsuarioComercial: idComercial,
      canal,
      notas: notas || null,
      usuarioAlta: Number(req.user.id_usuario),
    });

    return res.status(200).json({
      message: 'Comercial asignado correctamente',
      id_venta: idVenta,
    });
  } catch (error) {
    console.error('[hub] asignarVenta:', error.message);
    return res.status(500).json({ message: 'Error al asignar comercial' });
  }
};

const previewInvitacionHandler = async (req, res) => {
  try {
    if (!(await crmTablasDisponibles())) {
      return res.status(404).json({ message: 'Invitación no encontrada' });
    }

    const preview = await obtenerInvitacionPreview({
      token: req.query.inv,
      codigoCorto: req.query.codigo,
    });

    if (!preview) {
      return res.status(404).json({ message: 'Invitación no válida o expirada' });
    }

    return res.status(200).json(preview);
  } catch (error) {
    console.error('[hub] previewInvitacion:', error.message);
    return res.status(500).json({ message: 'Error al validar invitación' });
  }
};

module.exports = {
  obtenerContexto,
  listarVentasHandler,
  listarComercialesHandler,
  crearInvitacionHandler,
  asignarVentaHandler,
  previewInvitacionHandler,
};
