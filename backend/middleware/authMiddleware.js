const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'No autorizado: falta el token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'No autorizado: token inválido o expirado' });
  }
};

const requireRole = (...tiposPermitidos) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  if (!tiposPermitidos.includes(Number(req.user.tipo_usuario))) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  return next();
};

module.exports = { requireAuth, requireRole };
