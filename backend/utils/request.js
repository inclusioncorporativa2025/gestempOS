const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) return String(realIp).trim();
  const remote = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  return remote.replace(/^::ffff:/, '');
};

const getUserAgent = (req) => {
  const ua = req.headers['user-agent'];
  return ua ? String(ua).slice(0, 512) : null;
};

module.exports = {
  getClientIp,
  getUserAgent,
};
