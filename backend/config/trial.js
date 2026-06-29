const TRIAL_DAYS = Number(process.env.TRIAL_DAYS) || 15;
const TRIAL_WARN_DAYS = Number(process.env.TRIAL_WARN_DAYS) || 3;

const TRIAL_PAYMENT_HEADLINE =
  'Activa tu prueba gratuita de 15 días añadiendo un método de pago.';

const TRIAL_PAYMENT_DETAIL =
  'Disfrutarás de 15 días gratis. No se realizará ningún cargo hasta que finalice la prueba y puedes cancelar en cualquier momento antes, sin compromiso.';

module.exports = {
  TRIAL_DAYS,
  TRIAL_WARN_DAYS,
  TRIAL_PAYMENT_HEADLINE,
  TRIAL_PAYMENT_DETAIL,
};
