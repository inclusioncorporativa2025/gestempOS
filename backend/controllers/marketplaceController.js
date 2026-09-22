const {
  listarCatalogo,
  listarEstadoEmpresa,
  activarModuloEmpresa,
  cancelarModuloEmpresa,
  listarAsignacionesModulo,
  guardarAsignacionUsuario,
} = require('../services/markplaceModuloService');

const resolveIdEmpresa = (req) => {
  const fromBody = Number(req.body?.idEmpresa ?? req.body?.id_empresa);
  if (Number.isFinite(fromBody) && fromBody > 0) return fromBody;
  const fromUser = Number(req.user?.id_empresa);
  if (Number.isFinite(fromUser) && fromUser > 0) return fromUser;
  return null;
};

const getCatalogo = async (req, res) => {
  try {
    const modulos = await listarCatalogo();
    return res.status(200).json({ modulos });
  } catch (error) {
    console.error('getCatalogo marketplace:', error.message);
    return res.status(500).json({ message: 'Error al cargar el catálogo' });
  }
};

const getEstadoEmpresa = async (req, res) => {
  const idEmpresa = resolveIdEmpresa(req);
  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }

  try {
    const estado = await listarEstadoEmpresa(idEmpresa);
    return res.status(200).json({ id_empresa: idEmpresa, modulos: estado });
  } catch (error) {
    console.error('getEstadoEmpresa marketplace:', error.message);
    return res.status(500).json({ message: 'Error al consultar módulos de la empresa' });
  }
};

const postActivarModulo = async (req, res) => {
  const idEmpresa = resolveIdEmpresa(req);
  const codigoModulo = req.body?.codigoModulo ?? req.body?.codigo_modulo;

  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }
  if (!codigoModulo) {
    return res.status(400).json({ message: 'codigoModulo es obligatorio' });
  }

  try {
    const modulos = await activarModuloEmpresa({
      idEmpresa,
      codigoModulo,
      configJson: req.body?.config_json ?? req.body?.configJson,
      idUsuarioAlta: req.user?.id_usuario,
    });
    return res.status(200).json({
      message: 'Módulo activado para la empresa',
      id_empresa: idEmpresa,
      modulos,
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ message: error.message });
    }
    console.error('postActivarModulo:', error.message);
    return res.status(500).json({ message: 'Error al activar el módulo' });
  }
};

const postCancelarModulo = async (req, res) => {
  const idEmpresa = resolveIdEmpresa(req);
  const codigoModulo = req.body?.codigoModulo ?? req.body?.codigo_modulo;

  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }
  if (!codigoModulo) {
    return res.status(400).json({ message: 'codigoModulo es obligatorio' });
  }

  try {
    const modulos = await cancelarModuloEmpresa({
      idEmpresa,
      codigoModulo,
      idUsuarioBaja: req.user?.id_usuario,
    });
    return res.status(200).json({
      message: 'Módulo cancelado',
      id_empresa: idEmpresa,
      modulos,
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ message: error.message });
    }
    console.error('postCancelarModulo:', error.message);
    return res.status(500).json({ message: 'Error al cancelar el módulo' });
  }
};

const postListarAsignaciones = async (req, res) => {
  const idEmpresa = resolveIdEmpresa(req);
  const codigoModulo = req.body?.codigoModulo ?? req.body?.codigo_modulo;

  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }
  if (!codigoModulo) {
    return res.status(400).json({ message: 'codigoModulo es obligatorio' });
  }

  try {
    const data = await listarAsignacionesModulo(idEmpresa, codigoModulo);
    return res.status(200).json({ id_empresa: idEmpresa, ...data });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ message: error.message, code: error.code });
    }
    if (error.status === 404) {
      return res.status(404).json({ message: error.message });
    }
    console.error('postListarAsignaciones:', error.message);
    return res.status(500).json({ message: 'Error al listar asignaciones' });
  }
};

const postGuardarAsignacion = async (req, res) => {
  const idEmpresa = resolveIdEmpresa(req);
  const codigoModulo = req.body?.codigoModulo ?? req.body?.codigo_modulo;
  const idUsuario = Number(req.body?.idUsuario ?? req.body?.id_usuario);

  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }
  if (!codigoModulo) {
    return res.status(400).json({ message: 'codigoModulo es obligatorio' });
  }
  if (!Number.isFinite(idUsuario) || idUsuario <= 0) {
    return res.status(400).json({ message: 'idUsuario es obligatorio' });
  }

  try {
    const result = await guardarAsignacionUsuario({
      idEmpresa,
      codigoModulo,
      idUsuario,
      asignado: req.body?.asignado,
      canalEmail: req.body?.canal_email ?? req.body?.canalEmail,
      canalWhatsapp: req.body?.canal_whatsapp ?? req.body?.canalWhatsapp,
      idUsuarioActor: req.user?.id_usuario,
    });
    return res.status(200).json({
      message: 'Asignación guardada',
      ...result,
    });
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ message: error.message, code: error.code });
    }
    if (error.status === 400 || error.status === 404) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('postGuardarAsignacion:', error.message);
    return res.status(500).json({ message: 'Error al guardar la asignación' });
  }
};

module.exports = {
  getCatalogo,
  getEstadoEmpresa,
  postActivarModulo,
  postCancelarModulo,
  postListarAsignaciones,
  postGuardarAsignacion,
};
