const { resolverEnlacePagoCorto } = require('../services/enlacePagoService');
const { APP_URL } = require('../config/appUrls');

const resolverEnlacePagoHandler = async (req, res) => {
  try {
    const enlace = await resolverEnlacePagoCorto(req.params.codigo);
    return res.status(200).json(enlace);
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || 'No se pudo resolver el enlace de pago',
      code: error.code,
    });
  }
};

const redirectEnlacePagoHandler = async (req, res) => {
  try {
    const enlace = await resolverEnlacePagoCorto(req.params.codigo);
    return res.redirect(302, enlace.url);
  } catch (error) {
    if (error.code === 'ENLACE_CADUCADO') {
      const codigo = encodeURIComponent(req.params.codigo || '');
      return res.redirect(302, `${APP_URL}/pago/caducado?codigo=${codigo}`);
    }
    return res.redirect(302, `${APP_URL}/pago/error`);
  }
};

module.exports = {
  resolverEnlacePagoHandler,
  redirectEnlacePagoHandler,
};
