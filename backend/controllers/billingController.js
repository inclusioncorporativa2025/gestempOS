const Usuario = require('../models/Usuario');
const {
  procesarWebhookEvent,
  crearCheckoutSession,
  crearPortalSession,
  cancelarSuscripcion,
  reactivarSuscripcion,
  ampliarLicenciasStripe,
  obtenerEstadoFacturacion,
  verificarSesionCheckout,
  listarFacturasPagadas,
  listarFacturasEmitidas,
  getStripe,
} = require('../services/billingService');
const {
  obtenerInfoRenovacion,
  crearCheckoutRenovacionLegacy,
} = require('../services/legacyRenewalService');

const getIdEmpresaSesion = (req) => Number(req.user?.id_empresa);

const getEstado = async (req, res) => {
  try {
    const idEmpresa = getIdEmpresaSesion(req);
    if (!idEmpresa) {
      return res.status(400).json({ message: 'No hay empresa en la sesión' });
    }

    const estado = await obtenerEstadoFacturacion(idEmpresa);
    return res.status(200).json({ estado });
  } catch (error) {
    console.error('billing getEstado:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al obtener el estado de facturación',
      code: error.code,
    });
  }
};

const postCheckout = async (req, res) => {
  try {
    const idEmpresa = getIdEmpresaSesion(req);
    const idUsuario = Number(req.user?.id_usuario);
    const { plan, ciclo, licencias } = req.body ?? {};

    if (!idEmpresa || !idUsuario) {
      return res.status(400).json({ message: 'Sesión incompleta' });
    }

    const usuario = await Usuario.findByPk(idUsuario);
    if (!usuario?.email) {
      return res.status(400).json({ message: 'No se encontró el email del administrador' });
    }

    const resultado = await crearCheckoutSession({
      idEmpresa,
      email: usuario.email,
      nombre: usuario.nombre,
      planCodigo: plan,
      ciclo: ciclo === 'anual' ? 'anual' : 'mensual',
      licencias,
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('billing postCheckout:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al crear la sesión de pago',
      code: error.code,
    });
  }
};

const postPortal = async (req, res) => {
  try {
    const idEmpresa = getIdEmpresaSesion(req);
    if (!idEmpresa) {
      return res.status(400).json({ message: 'No hay empresa en la sesión' });
    }

    const { returnUrl } = req.body ?? {};
    const resultado = await crearPortalSession(idEmpresa, returnUrl);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('billing postPortal:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al abrir el portal de facturación',
      code: error.code,
    });
  }
};

const postCancelar = async (req, res) => {
  try {
    const idEmpresa = getIdEmpresaSesion(req);
    if (!idEmpresa) {
      return res.status(400).json({ message: 'No hay empresa en la sesión' });
    }

    const resultado = await cancelarSuscripcion(idEmpresa);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('billing postCancelar:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al cancelar la suscripción',
      code: error.code,
    });
  }
};

const postReactivar = async (req, res) => {
  try {
    const idEmpresa = getIdEmpresaSesion(req);
    if (!idEmpresa) {
      return res.status(400).json({ message: 'No hay empresa en la sesión' });
    }

    const resultado = await reactivarSuscripcion(idEmpresa);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('billing postReactivar:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al reactivar la suscripción',
      code: error.code,
    });
  }
};

const postAmpliarLicencias = async (req, res) => {
  try {
    const idEmpresa = getIdEmpresaSesion(req);
    if (!idEmpresa) {
      return res.status(400).json({ message: 'No hay empresa en la sesión' });
    }

    const { licencias } = req.body ?? {};
    const resultado = await ampliarLicenciasStripe(idEmpresa, { licencias });
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('billing postAmpliarLicencias:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al ampliar las licencias',
      code: error.code,
    });
  }
};

const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ message: 'Falta session_id' });
    }

    const sesion = await verificarSesionCheckout(sessionId);
    return res.status(200).json({ sesion });
  } catch (error) {
    console.error('billing getSession:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al verificar la sesión',
    });
  }
};

const getFacturas = async (req, res) => {
  try {
    const idEmpresa = getIdEmpresaSesion(req);
    if (!idEmpresa) {
      return res.status(400).json({ message: 'No hay empresa en la sesión' });
    }

    const limit = Number(req.query?.limit) || 5;
    const resultado = await listarFacturasEmitidas(idEmpresa, { limit });
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('billing getFacturas:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al obtener las facturas',
      code: error.code,
    });
  }
};

const handleStripeWebhook = async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(503).json({ message: 'Webhook no configurado' });
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    return res.status(400).json({ message: 'Falta firma Stripe' });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook firma inválida:', error.message);
    return res.status(400).json({ message: `Webhook Error: ${error.message}` });
  }

  try {
    await procesarWebhookEvent(event);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook procesamiento:', error);
    return res.status(500).json({ message: 'Error procesando webhook' });
  }
};

const getFacturaDocumento = async (req, res) => {
  try {
    const idEmpresa = getIdEmpresaSesion(req);
    const idFactura = Number(req.params.idFactura);

    if (!idEmpresa || !idFactura) {
      return res.status(400).json({ message: 'Parámetros inválidos' });
    }

    const { obtenerFactura, renderFacturaHtml } = require('../services/facturaService');
    const factura = await obtenerFactura(idEmpresa, idFactura);

    if (!factura) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    const html = renderFacturaHtml(factura);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('billing getFacturaDocumento:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al generar el documento',
    });
  }
};

const getRenovacionInfo = async (req, res) => {
  try {
    const token = String(req.query?.token || '').trim();
    const info = await obtenerInfoRenovacion(token);
    return res.status(200).json({ info });
  } catch (error) {
    console.error('billing getRenovacionInfo:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'No se pudo cargar la renovación',
      code: error.code,
    });
  }
};

const postRenovacionCheckout = async (req, res) => {
  try {
    const { token, plan, ciclo, licencias } = req.body ?? {};
    const resultado = await crearCheckoutRenovacionLegacy({
      rawToken: token,
      planCodigo: plan,
      ciclo,
      licencias,
    });
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('billing postRenovacionCheckout:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al iniciar el pago de renovación',
      code: error.code,
    });
  }
};

module.exports = {
  getEstado,
  postCheckout,
  postPortal,
  postCancelar,
  postReactivar,
  postAmpliarLicencias,
  getSession,
  getFacturas,
  getFacturaDocumento,
  handleStripeWebhook,
  getRenovacionInfo,
  postRenovacionCheckout,
};
