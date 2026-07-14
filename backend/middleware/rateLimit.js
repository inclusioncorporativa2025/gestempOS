const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { getClientIp } = require('../utils/request');

const isRateLimitDisabled = () => process.env.RATE_LIMIT_DISABLED === 'true';

const clientKey = (req) => {
  const ip = getClientIp(req) || req.ip;
  return ip ? ipKeyGenerator(ip) : 'unknown';
};

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isRateLimitDisabled,
    keyGenerator: clientKey,
    handler: (_req, res) => {
      res.status(429).json({
        message,
        code: 'RATE_LIMIT_EXCEEDED',
      });
    },
  });

/** Login, reset, checkout reanudado, selección de empresa (pre-auth) */
const authLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
});

/** Registro público de empresa / trial */
const registerLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_REGISTER_WINDOW_MS) || 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 5,
  message: 'Has superado el límite de registros. Inténtalo más tarde.',
});

/** Formulario demo landing */
const landingLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_LANDING_WINDOW_MS) || 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_LANDING_MAX) || 10,
  message: 'Demasiadas solicitudes desde tu conexión. Inténtalo más tarde.',
});

/** Endpoints de facturación públicos (sesión Stripe, renovación legacy) */
const billingPublicLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_BILLING_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_BILLING_MAX) || 30,
  message: 'Demasiadas consultas de facturación. Inténtalo más tarde.',
});

/** Webhooks de terceros (Calendly): límite alto para no bloquear el servicio */
const webhookLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WEBHOOK_WINDOW_MS) || 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_WEBHOOK_MAX) || 200,
  message: 'Demasiadas solicitudes al webhook.',
});

module.exports = {
  authLimiter,
  registerLimiter,
  landingLimiter,
  billingPublicLimiter,
  webhookLimiter,
};
