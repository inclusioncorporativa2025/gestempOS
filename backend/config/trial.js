const TRIAL_DAYS = Number(process.env.TRIAL_DAYS) || 15;
const TRIAL_WARN_DAYS = Number(process.env.TRIAL_WARN_DAYS) || 3;

const TRIAL_PAYMENT_HEADLINE =
  'Tu periodo de prueba ha finalizado. Activa una suscripción para seguir usando Timecor.';

const TRIAL_PAYMENT_DETAIL =
  'Elige plan y licencias en Facturación y completa el pago con tarjeta en Stripe.';

module.exports = {
  TRIAL_DAYS,
  TRIAL_WARN_DAYS,
  TRIAL_PAYMENT_HEADLINE,
  TRIAL_PAYMENT_DETAIL,
};
