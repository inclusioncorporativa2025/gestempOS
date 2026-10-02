const {
  obtenerEstadoOnboarding,
  cerrarOnboarding,
  omitirOnboarding,
  marcarPasoManual,
} = require('../services/onboardingService');

const resolveIdEmpresa = (req) => {
  const fromBody = Number(req.body?.idEmpresa ?? req.body?.id_empresa);
  if (Number.isFinite(fromBody) && fromBody > 0) return fromBody;
  const fromUser = Number(req.user?.id_empresa);
  if (Number.isFinite(fromUser) && fromUser > 0) return fromUser;
  return null;
};

const postEstado = async (req, res) => {
  const idEmpresa = resolveIdEmpresa(req);
  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }

  try {
    const data = await obtenerEstadoOnboarding({ user: req.user, idEmpresa });
    return res.status(200).json(data);
  } catch (error) {
    console.error('postEstado onboarding:', error.message);
    return res.status(500).json({ message: 'Error al cargar la guía de inicio' });
  }
};

const postCerrar = async (req, res) => {
  const idEmpresa = resolveIdEmpresa(req);
  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }

  try {
    const data = await cerrarOnboarding({ user: req.user, idEmpresa });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    if (error.status === 403) {
      return res.status(403).json({ message: error.message });
    }
    console.error('postCerrar onboarding:', error.message);
    return res.status(500).json({ message: 'Error al cerrar la guía' });
  }
};

const postOmitir = async (req, res) => {
  const idEmpresa = resolveIdEmpresa(req);
  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }

  try {
    const data = await omitirOnboarding({ user: req.user, idEmpresa });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ message: error.message });
    }
    console.error('postOmitir onboarding:', error.message);
    return res.status(500).json({ message: 'Error al cerrar la guía' });
  }
};

const postMarcarPaso = async (req, res) => {
  const idEmpresa = resolveIdEmpresa(req);
  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }

  const codigoPaso = req.body?.codigoPaso ?? req.body?.codigo_paso;
  const visitaRuta = req.body?.visitaRuta ?? req.body?.visita_ruta;

  try {
    const data = await marcarPasoManual({
      user: req.user,
      idEmpresa,
      codigoPaso,
      visitaRuta,
    });
    return res.status(200).json(data);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    if (error.status === 403) {
      return res.status(403).json({ message: error.message });
    }
    console.error('postMarcarPaso onboarding:', error.message);
    return res.status(500).json({ message: 'Error al actualizar el paso' });
  }
};

module.exports = {
  postEstado,
  postCerrar,
  postOmitir,
  postMarcarPaso,
};
