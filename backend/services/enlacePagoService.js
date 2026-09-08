const crypto = require('crypto');
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { APP_URL } = require('../config/appUrls');

const HORAS_VALIDEZ_ENLACE = 24;

let enlacePagoColumnasCache = null;

const enlacePagoColumnasDisponibles = async () => {
  if (enlacePagoColumnasCache != null) return enlacePagoColumnasCache;
  try {
    await sequelize.query(
      'SELECT enlace_pago_codigo FROM empresa_facturacion LIMIT 1',
      { type: QueryTypes.SELECT },
    );
    enlacePagoColumnasCache = true;
  } catch {
    enlacePagoColumnasCache = false;
  }
  return enlacePagoColumnasCache;
};

const generarCodigoEnlacePago = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TC-P';
  for (let i = 0; i < 6; i += 1) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return code;
};

const generarCodigoEnlacePagoUnico = async () => {
  for (let intento = 0; intento < 8; intento += 1) {
    const codigo = generarCodigoEnlacePago();
    const [existente] = await sequelize.query(
      `SELECT id_empresa FROM empresa_facturacion
       WHERE enlace_pago_codigo = :codigo LIMIT 1`,
      { replacements: { codigo }, type: QueryTypes.SELECT },
    );
    if (!existente) return codigo;
  }
  const error = new Error('No se pudo generar un código de pago único');
  error.code = 'CODIGO_PAGO_DUP';
  throw error;
};

const construirUrlPublicaPago = (codigo) =>
  `${APP_URL}/pago/${encodeURIComponent(codigo)}`;

/**
 * Guarda el checkout Stripe en empresa_facturacion y devuelve URL corta pública.
 * Si las columnas no existen aún, devuelve la URL de Stripe sin cambios.
 */
const publicarEnlacePagoCorto = async ({ idEmpresa, checkout }) => {
  const stripeUrl = checkout?.url;
  const sessionId = checkout?.sessionId;
  if (!stripeUrl || !sessionId) {
    const error = new Error('Checkout Stripe incompleto');
    error.status = 500;
    throw error;
  }

  if (!(await enlacePagoColumnasDisponibles())) {
    return {
      url: stripeUrl,
      codigo: null,
      sessionId,
      stripeUrl,
    };
  }

  const codigo = await generarCodigoEnlacePagoUnico();
  const fechaExpiracion = new Date();
  fechaExpiracion.setHours(fechaExpiracion.getHours() + HORAS_VALIDEZ_ENLACE);

  await sequelize.query(
    `UPDATE empresa_facturacion
     SET enlace_pago_codigo = :codigo,
         enlace_pago_stripe_url = :stripeUrl,
         enlace_pago_session_id = :sessionId,
         enlace_pago_expira = :fechaExpiracion
     WHERE id_empresa = :idEmpresa`,
    {
      replacements: {
        codigo,
        stripeUrl,
        sessionId,
        fechaExpiracion,
        idEmpresa,
      },
    },
  );

  return {
    url: construirUrlPublicaPago(codigo),
    codigo,
    sessionId,
    stripeUrl,
    fecha_expiracion: fechaExpiracion,
  };
};

const resolverEnlacePagoCorto = async (codigoRaw) => {
  const codigo = String(codigoRaw || '').trim().toUpperCase();
  if (!codigo) {
    const error = new Error('Enlace de pago no válido');
    error.status = 400;
    error.code = 'ENLACE_INVALIDO';
    throw error;
  }

  if (!(await enlacePagoColumnasDisponibles())) {
    const error = new Error('Enlaces de pago no disponibles');
    error.status = 503;
    error.code = 'ENLACE_PAGO_NO_DISPONIBLE';
    throw error;
  }

  const [enlace] = await sequelize.query(
    `SELECT enlace_pago_codigo AS codigo,
            enlace_pago_stripe_url AS stripe_checkout_url,
            enlace_pago_expira AS fecha_expiracion
     FROM empresa_facturacion
     WHERE enlace_pago_codigo = :codigo
     LIMIT 1`,
    { replacements: { codigo }, type: QueryTypes.SELECT },
  );

  if (!enlace) {
    const error = new Error('Enlace de pago no encontrado');
    error.status = 404;
    error.code = 'ENLACE_NO_ENCONTRADO';
    throw error;
  }

  if (enlace.fecha_expiracion && new Date(enlace.fecha_expiracion).getTime() <= Date.now()) {
    const error = new Error('El enlace de pago ha caducado. Solicita uno nuevo a tu comercial.');
    error.status = 410;
    error.code = 'ENLACE_CADUCADO';
    throw error;
  }

  return {
    codigo: enlace.codigo,
    url: enlace.stripe_checkout_url,
  };
};

module.exports = {
  enlacePagoColumnasDisponibles,
  publicarEnlacePagoCorto,
  resolverEnlacePagoCorto,
  construirUrlPublicaPago,
};
