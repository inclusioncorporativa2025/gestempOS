const {
  obtenerClaimsHub,
  listarVentas,
  listarComerciales,
  crearInvitacionRegistro,
  listarInvitaciones,
  listarCampanas,
  crearCampana,
  resolverCampanaActiva,
  asignarVentaManual,
  obtenerInvitacionPreview,
  eliminarVentaHub,
  transferirVentaHub,
  eliminarInvitacionHub,
  transferirInvitacionHub,
  crmTablasDisponibles,
  usuarioPuedeGestionarAccesosHub,
  listarPuestosInternos,
  listarAccesosHub,
  listarUsuariosInternosElegibles,
  asignarPuestoHub,
  revocarPuestoHub,
  obtenerMetricasDashboard,
} = require('../services/crmHubService');
const { isEmailValido } = require('../utils/identityChecks');
const { enviarInvitacionRegistroHub } = require('../utils/mailService');

const normalizarTelefonoInvitacion = (raw) => {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9 && /^[6789]/.test(digits)) {
    digits = `34${digits}`;
  }
  return digits;
};

const telefonoInvitacionValido = (raw) => {
  const digits = normalizarTelefonoInvitacion(raw);
  return digits.length >= 10 && digits.length <= 15;
};

const formatearFechaExpiracion = (fecha) => {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

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
      puede_gestionar_accesos: usuarioPuedeGestionarAccesosHub(req.user),
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

const listarInvitacionesHandler = async (req, res) => {
  try {
    const data = await listarInvitaciones(req.user, {
      q: req.query.q,
      estado: req.query.estado,
      pagina: Number(req.query.pagina) || 1,
      limite: Number(req.query.limite) || 50,
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('[hub] listarInvitaciones:', error.message);
    return res.status(500).json({ message: 'Error al listar invitaciones' });
  }
};

const listarComercialesHandler = async (req, res) => {
  try {
    const soloComercial = req.query.solo_comercial === '1';
    const comerciales = await listarComerciales({ soloComercial });
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
      dias_validez: diasValidez,
      id_campana: idCampanaBody,
      nombre_campana: nombreCampanaBody,
    } = req.body || {};

    const email = String(emailPrevisto || '').trim().toLowerCase();
    const telefono = String(telefonoPrevisto || '').trim();
    const tieneEmail = email.length > 0;
    const tieneTelefono = telefono.length > 0 && telefonoInvitacionValido(telefono);

    if (!tieneEmail && !tieneTelefono) {
      return res.status(400).json({
        message: 'Indica al menos un email o un teléfono válido del cliente',
        code: 'CONTACTO_REQUERIDO',
      });
    }

    if (tieneEmail && !isEmailValido(email)) {
      return res.status(400).json({
        message: 'El email del cliente no es válido',
        code: 'EMAIL_INVALIDO',
      });
    }

    if (telefono.length > 0 && !telefonoInvitacionValido(telefono)) {
      return res.status(400).json({
        message: 'El teléfono del cliente no es válido (mínimo 9 dígitos)',
        code: 'TELEFONO_INVALIDO',
      });
    }

    let idCampana = idCampanaBody ? Number(idCampanaBody) : null;
    const nombreCampana = String(nombreCampanaBody || '').trim();
    const puedeGestionarCampanas = usuarioPuedeGestionarAccesosHub(req.user);

    if (!idCampana && nombreCampana) {
      if (!puedeGestionarCampanas) {
        return res.status(403).json({
          message: 'Solo ROOT, admin o jefe comercial pueden crear campañas',
          code: 'CAMPANA_SIN_PERMISO',
        });
      }
      const campanaNueva = await crearCampana({
        nombre: nombreCampana,
        idUsuario: Number(req.user.id_usuario),
        usuarioAlta: Number(req.user.id_usuario),
      });
      idCampana = campanaNueva?.id_campana ?? null;
    } else if (idCampana) {
      const campana = await resolverCampanaActiva(idCampana);
      if (!campana) {
        return res.status(400).json({
          message: 'La campaña seleccionada no es válida',
          code: 'CAMPANA_INVALIDA',
        });
      }
      idCampana = campana.id_campana;
    }

    let canal = 'telefono';
    if (tieneEmail && tieneTelefono) canal = 'mixto';
    else if (tieneEmail) canal = 'email';

    const invitacion = await crearInvitacionRegistro({
      idUsuarioComercial: Number(req.user.id_usuario),
      emailPrevisto: tieneEmail ? email : null,
      telefonoPrevisto: tieneTelefono ? telefono : null,
      canal,
      diasValidez: diasValidez || 30,
      idCampana,
    });

    const registerUrl = `${APP_PUBLIC_URL}/register?inv=${encodeURIComponent(invitacion.token)}`;
    const fechaExpiracionLabel = formatearFechaExpiracion(invitacion.fecha_expiracion);

    let emailEnviado = false;
    let emailError = null;

    if (tieneEmail) {
      try {
        await enviarInvitacionRegistroHub({
          to: email,
          registerUrl,
          codigoCorto: invitacion.codigo_corto,
          fechaExpiracionLabel,
          comercialNombre: req.user.nombre,
        });
        emailEnviado = true;
      } catch (mailErr) {
        console.error('[hub] enviar email invitacion:', mailErr.message);
        emailError = mailErr.code === 'SMTP_NO_CONFIGURADO'
          ? 'El envío de correos no está configurado en el servidor'
          : 'No se pudo enviar el correo al cliente';
      }
    }

    return res.status(201).json({
      message: emailEnviado
        ? 'Invitación creada y enviada por correo'
        : emailError
          ? 'Invitación creada, pero no se pudo enviar el correo'
          : 'Invitación creada',
      id_invitacion: invitacion.id_invitacion,
      codigo_corto: invitacion.codigo_corto,
      register_url: registerUrl,
      fecha_expiracion: invitacion.fecha_expiracion,
      email_enviado: emailEnviado,
      email_destino: tieneEmail ? email : null,
      email_error: emailError,
      telefono_previsto: tieneTelefono ? telefono : null,
    });
  } catch (error) {
    if (error.code === 'CAMPANA_INVALIDA' || error.code === 'NOMBRE_INVALIDO') {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    if (error.code === 'CAMPANAS_NO_DISPONIBLES') {
      return res.status(503).json({ message: error.message, code: error.code });
    }
    console.error('[hub] crearInvitacion:', error.message);
    return res.status(500).json({ message: 'Error al crear la invitación' });
  }
};

const listarCampanasHandler = async (req, res) => {
  try {
    const campanas = await listarCampanas();
    return res.status(200).json({ campanas });
  } catch (error) {
    console.error('[hub] listarCampanas:', error.message);
    return res.status(500).json({ message: 'Error al listar campañas' });
  }
};

const crearCampanaHandler = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body || {};
    const campana = await crearCampana({
      nombre,
      descripcion,
      idUsuario: Number(req.user.id_usuario),
      usuarioAlta: Number(req.user.id_usuario),
    });
    return res.status(201).json({
      message: 'Campaña creada correctamente',
      campana,
    });
  } catch (error) {
    if (error.code === 'NOMBRE_INVALIDO') {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    if (error.code === 'CAMPANAS_NO_DISPONIBLES') {
      return res.status(503).json({ message: error.message, code: error.code });
    }
    console.error('[hub] crearCampana:', error.message);
    return res.status(500).json({ message: 'Error al crear la campaña' });
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

const listarAccesosHubHandler = async (req, res) => {
  try {
    const accesos = await listarAccesosHub(req.user);
    return res.status(200).json({ accesos });
  } catch (error) {
    console.error('[hub] listarAccesos:', error.message);
    return res.status(500).json({ message: 'Error al listar accesos del hub' });
  }
};

const listarPuestosHubHandler = async (req, res) => {
  try {
    const puestos = await listarPuestosInternos(req.user);
    return res.status(200).json({ puestos });
  } catch (error) {
    console.error('[hub] listarPuestos:', error.message);
    return res.status(500).json({ message: 'Error al listar puestos del hub' });
  }
};

const listarUsuariosInternosHandler = async (req, res) => {
  try {
    const usuarios = await listarUsuariosInternosElegibles(req.user);
    return res.status(200).json({ usuarios });
  } catch (error) {
    console.error('[hub] listarUsuariosInternos:', error.message);
    return res.status(500).json({ message: 'Error al listar usuarios internos' });
  }
};

const asignarAccesoHubHandler = async (req, res) => {
  try {
    const idUsuario = Number(req.body?.id_usuario);
    const idPuesto = Number(req.body?.id_puesto);

    if (!idUsuario || !idPuesto) {
      return res.status(400).json({ message: 'id_usuario e id_puesto son obligatorios' });
    }

    const idAsignacion = await asignarPuestoHub({
      idUsuario,
      idPuesto,
      usuarioAlta: Number(req.user.id_usuario),
      user: req.user,
    });

    return res.status(201).json({
      message: 'Acceso asignado. El usuario ya puede entrar al panel de ventas.',
      id: idAsignacion,
    });
  } catch (error) {
    if (error.code === 'PUESTO_YA_ASIGNADO') {
      return res.status(409).json({ message: error.message });
    }
    if (error.code === 'PUESTO_NO_PERMITIDO' || error.code === 'PUESTO_INVALIDO') {
      return res.status(403).json({ message: error.message });
    }
    console.error('[hub] asignarAcceso:', error.message);
    return res.status(500).json({ message: 'Error al asignar acceso al panel de ventas' });
  }
};

const revocarAccesoHubHandler = async (req, res) => {
  try {
    const idAsignacion = Number(req.params.id);
    if (!idAsignacion) {
      return res.status(400).json({ message: 'Id de asignación inválido' });
    }

    await revocarPuestoHub({ idAsignacion, user: req.user });

    return res.status(200).json({ message: 'Acceso revocado correctamente' });
  } catch (error) {
    if (error.code === 'ASIGNACION_NO_ENCONTRADA') {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === 'PUESTO_NO_PERMITIDO' || error.code === 'ACCESO_DENEGADO') {
      return res.status(403).json({ message: error.message });
    }
    console.error('[hub] revocarAcceso:', error.message);
    return res.status(500).json({ message: 'Error al revocar acceso al panel de ventas' });
  }
};

const obtenerMetricasDashboardHandler = async (_req, res) => {
  try {
    const metricas = await obtenerMetricasDashboard();
    return res.status(200).json(metricas);
  } catch (error) {
    console.error('[hub] obtenerMetricas:', error.message, error.parent?.sqlMessage || '');
    return res.status(500).json({ message: 'Error al cargar métricas del hub' });
  }
};

const mapHubCarteraError = (error, res, contexto) => {
  if (error.code === 'ACCESO_DENEGADO' || error.code === 'COMERCIAL_FUERA_DE_ALCANCE') {
    return res.status(403).json({ message: error.message, code: error.code });
  }
  if (
    error.code === 'VENTA_NO_ENCONTRADA'
    || error.code === 'INVITACION_NO_ENCONTRADA'
  ) {
    return res.status(404).json({ message: error.message, code: error.code });
  }
  if (
    error.code === 'COMERCIAL_DESTINO_INVALIDO'
    || error.code === 'COMERCIAL_IGUAL'
    || error.code === 'INVITACION_USADA'
  ) {
    return res.status(400).json({ message: error.message, code: error.code });
  }
  console.error(`[hub] ${contexto}:`, error.message);
  return res.status(500).json({ message: `Error al ${contexto}` });
};

const eliminarVentaHandler = async (req, res) => {
  try {
    const idVenta = Number(req.params.id);
    if (!idVenta) {
      return res.status(400).json({ message: 'Id de cliente inválido' });
    }

    const result = await eliminarVentaHub({ idVenta, user: req.user });
    return res.status(200).json({
      message: 'Cliente eliminado del panel de ventas',
      ...result,
    });
  } catch (error) {
    return mapHubCarteraError(error, res, 'eliminar cliente');
  }
};

const transferirVentaHandler = async (req, res) => {
  try {
    const idVenta = Number(req.params.id);
    const idComercial = Number(req.body?.id_usuario_comercial);

    if (!idVenta || !idComercial) {
      return res.status(400).json({
        message: 'Id de cliente e id_usuario_comercial son obligatorios',
      });
    }

    const result = await transferirVentaHub({
      idVenta,
      idUsuarioComercial: idComercial,
      user: req.user,
    });

    return res.status(200).json({
      message: 'Cliente transferido correctamente',
      ...result,
    });
  } catch (error) {
    return mapHubCarteraError(error, res, 'transferir cliente');
  }
};

const eliminarInvitacionHandler = async (req, res) => {
  try {
    const idInvitacion = Number(req.params.id);
    if (!idInvitacion) {
      return res.status(400).json({ message: 'Id de invitación inválido' });
    }

    const result = await eliminarInvitacionHub({ idInvitacion, user: req.user });
    return res.status(200).json({
      message: 'Invitación eliminada',
      ...result,
    });
  } catch (error) {
    return mapHubCarteraError(error, res, 'eliminar invitación');
  }
};

const transferirInvitacionHandler = async (req, res) => {
  try {
    const idInvitacion = Number(req.params.id);
    const idComercial = Number(req.body?.id_usuario_comercial);

    if (!idInvitacion || !idComercial) {
      return res.status(400).json({
        message: 'Id de invitación e id_usuario_comercial son obligatorios',
      });
    }

    const result = await transferirInvitacionHub({
      idInvitacion,
      idUsuarioComercial: idComercial,
      user: req.user,
    });

    return res.status(200).json({
      message: 'Invitación transferida correctamente',
      ...result,
    });
  } catch (error) {
    return mapHubCarteraError(error, res, 'transferir invitación');
  }
};

module.exports = {
  obtenerContexto,
  listarVentasHandler,
  listarInvitacionesHandler,
  listarComercialesHandler,
  crearInvitacionHandler,
  listarCampanasHandler,
  crearCampanaHandler,
  asignarVentaHandler,
  previewInvitacionHandler,
  listarAccesosHubHandler,
  listarPuestosHubHandler,
  listarUsuariosInternosHandler,
  asignarAccesoHubHandler,
  revocarAccesoHubHandler,
  obtenerMetricasDashboardHandler,
  eliminarVentaHandler,
  transferirVentaHandler,
  eliminarInvitacionHandler,
  transferirInvitacionHandler,
};
