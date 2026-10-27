const { timingSafeEqual } = require('crypto');

const readSecret = (req) => {
  const header = req.headers['x-iamcor-provision-secret'];
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }
  const body = req.body?.provision_secret;
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  return null;
};

const getExpectedSecret = () => {
  const raw = (process.env.IAMCOR_PROVISION_WEBHOOK_SECRET || '').trim();
  if (!raw || raw.length < 32) {
    return null;
  }
  return raw;
};

const requireIamcorProvisionSecret = (req, res, next) => {
  const expected = getExpectedSecret();
  if (!expected) {
    return res.status(503).json({
      success: false,
      error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'Webhook IAMCOR no configurado' },
    });
  }

  const provided = readSecret(req);
  if (!provided) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Secreto requerido' },
    });
  }

  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Secreto inválido' },
    });
  }

  return next();
};

module.exports = { requireIamcorProvisionSecret };
