const { sequelize } = require('../config/db');
const {
  TRIAL_DAYS,
  TRIAL_WARN_DAYS,
  TRIAL_PAYMENT_HEADLINE,
  TRIAL_PAYMENT_DETAIL,
} = require('../config/trial');

const MS_DIA = 24 * 60 * 60 * 1000;

/** Suscripción de pago vigente (Stripe u operador). */
const ESTADOS_SUSCRIPCION_ACTIVA = new Set(['active', 'past_due']);

const addDays = (date, days) => new Date(date.getTime() + days * MS_DIA);

const obtenerFacturacionEmpresa = async (idEmpresa) => {
  const rows = await sequelize.query(
    `SELECT modo_facturacion, trial_ends_at, estado_suscripcion, stripe_subscription_id
     FROM empresa_facturacion
     WHERE id_empresa = :idEmpresa
     LIMIT 1`,
    {
      replacements: { idEmpresa },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return rows[0] ?? null;
};

const tieneSuscripcionDePago = (facturacion) =>
  ESTADOS_SUSCRIPCION_ACTIVA.has(String(facturacion?.estado_suscripcion || '').toLowerCase());

const estaEnPeriodoTrial = (facturacion) => {
  const modo = String(facturacion?.modo_facturacion || '').toLowerCase();
  const estado = String(facturacion?.estado_suscripcion || '').toLowerCase();
  return modo === 'trial' || estado === 'trialing';
};

const evaluarEstadoTrial = (facturacion) => {
  if (!facturacion) {
    return {
      enPrueba: false,
      activa: true,
      expirada: false,
      legacy: true,
      diasRestantes: null,
      fechaFin: null,
      advertir: false,
    };
  }

  if (facturacion.modo_facturacion === 'legacy') {
    return {
      enPrueba: false,
      activa: true,
      expirada: false,
      legacy: true,
      diasRestantes: null,
      fechaFin: null,
      advertir: false,
    };
  }

  if (
    facturacion.modo_facturacion === 'trial' &&
    !facturacion.stripe_subscription_id
  ) {
    const fin = facturacion.trial_ends_at ? new Date(facturacion.trial_ends_at) : null;
    if (!fin) {
      return {
        enPrueba: true,
        activa: true,
        expirada: false,
        diasRestantes: TRIAL_DAYS,
        fechaFin: null,
        advertir: false,
      };
    }

    const msRestantes = fin.getTime() - Date.now();
    const diasRestantes = Math.max(0, Math.ceil(msRestantes / MS_DIA));
    const expirada = msRestantes <= 0;

    return {
      enPrueba: true,
      activa: !expirada,
      expirada,
      requierePlan: expirada,
      diasRestantes,
      fechaFin: fin.toISOString(),
      advertir: !expirada && diasRestantes <= TRIAL_WARN_DAYS,
    };
  }

  const estadoSuscripcion = String(facturacion?.estado_suscripcion || '').toLowerCase();
  if (estadoSuscripcion === 'canceled') {
    return {
      enPrueba: false,
      activa: false,
      expirada: true,
      requierePlan: true,
      cancelada: true,
      diasRestantes: 0,
      fechaFin: facturacion.trial_ends_at,
      advertir: false,
    };
  }

  if (tieneSuscripcionDePago(facturacion)) {
    return {
      enPrueba: false,
      activa: true,
      expirada: false,
      suscripcionActiva: true,
      diasRestantes: null,
      fechaFin: facturacion.trial_ends_at,
      advertir: false,
    };
  }

  if (!estaEnPeriodoTrial(facturacion)) {
    return {
      enPrueba: false,
      activa: false,
      expirada: true,
      requierePlan: true,
      diasRestantes: 0,
      fechaFin: facturacion.trial_ends_at,
      advertir: false,
    };
  }

  const fin = facturacion.trial_ends_at ? new Date(facturacion.trial_ends_at) : null;
  if (!fin) {
    return {
      enPrueba: true,
      activa: true,
      expirada: false,
      diasRestantes: TRIAL_DAYS,
      fechaFin: null,
      advertir: false,
    };
  }

  const msRestantes = fin.getTime() - Date.now();
  const diasRestantes = Math.max(0, Math.ceil(msRestantes / MS_DIA));
  const expirada = msRestantes <= 0;

  return {
    enPrueba: true,
    activa: !expirada,
    expirada,
    requierePlan: expirada,
    diasRestantes,
    fechaFin: fin.toISOString(),
    advertir: !expirada && diasRestantes <= TRIAL_WARN_DAYS,
  };
};

const obtenerEstadoTrialEmpresa = async (idEmpresa) => {
  const facturacion = await obtenerFacturacionEmpresa(idEmpresa);
  return evaluarEstadoTrial(facturacion);
};

const empresaTieneAccesoSuscripcion = async (idEmpresa) => {
  const estado = await obtenerEstadoTrialEmpresa(idEmpresa);
  return estado.activa;
};

const buildTrialExpiredPayload = (estado) => ({
  code: 'TRIAL_EXPIRED',
  message: estado?.cancelada
    ? 'Has cancelado la prueba gratuita. Activa una suscripción para volver a usar Timecor.'
    : 'Tu periodo de prueba de 15 días ha finalizado. Elige un plan para seguir usando Timecor.',
  trial: {
    expirada: true,
    cancelada: Boolean(estado?.cancelada),
    fechaFin: estado.fechaFin,
    diasRestantes: 0,
  },
});

const buildPaymentRequiredPayload = (estado) => ({
  code: 'PAYMENT_REQUIRED',
  message: TRIAL_PAYMENT_HEADLINE,
  detail: TRIAL_PAYMENT_DETAIL,
  trial: estado,
});

const assertEmpresaTrialActiva = async (idEmpresa) => {
  const estado = await obtenerEstadoTrialEmpresa(idEmpresa);
  if (!estado.activa) {
    if (estado.requierePago) {
      const error = new Error(buildPaymentRequiredPayload(estado).message);
      error.code = 'PAYMENT_REQUIRED';
      error.status = 403;
      error.trial = estado;
      throw error;
    }

    const error = new Error(buildTrialExpiredPayload(estado).message);
    error.code = 'TRIAL_EXPIRED';
    error.status = 403;
    error.trial = estado;
    throw error;
  }
  return estado;
};

const calcularFechaFinPrueba = (desde = new Date()) => addDays(desde, TRIAL_DAYS);

module.exports = {
  TRIAL_DAYS,
  TRIAL_WARN_DAYS,
  TRIAL_PAYMENT_HEADLINE,
  TRIAL_PAYMENT_DETAIL,
  ESTADOS_SUSCRIPCION_ACTIVA,
  obtenerFacturacionEmpresa,
  evaluarEstadoTrial,
  obtenerEstadoTrialEmpresa,
  empresaTieneAccesoSuscripcion,
  assertEmpresaTrialActiva,
  buildTrialExpiredPayload,
  buildPaymentRequiredPayload,
  calcularFechaFinPrueba,
};
