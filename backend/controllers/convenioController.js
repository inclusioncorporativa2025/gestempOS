const {
  listarCatalogo,
  obtenerCatalogoPorId,
  crearCatalogo,
  actualizarCatalogo,
  bajaCatalogo,
  listarEmpresaConvenios,
  incorporarConvenioEmpresa,
  actualizarEmpresaConvenio,
  bajaEmpresaConvenio,
  resolverConvenioUsuario,
  validarAsignacionConvenio,
} = require('../services/convenioService');
const { calcularDiasConsumoAusencia } = require('../services/vacacionesService');
const { ROLES } = require('../middleware/authMiddleware');

const esRoot = (req) => Number(req.user?.tipo_usuario) === ROLES.ROOT;

const getCatalogo = async (req, res) => {
  try {
    const convenios = await listarCatalogo({ soloActivos: !esRoot(req) });
    return res.status(200).json({ convenios });
  } catch (error) {
    console.error('convenio getCatalogo:', error);
    return res.status(500).json({ message: 'Error al listar convenios' });
  }
};

const postCatalogo = async (req, res) => {
  try {
    const convenio = await crearCatalogo(req.body, req.user.id_usuario);
    return res.status(201).json({ convenio });
  } catch (error) {
    console.error('convenio postCatalogo:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al crear convenio',
    });
  }
};

const putCatalogo = async (req, res) => {
  try {
    const idConvenio = Number(req.body?.id_convenio ?? req.params?.id);
    const convenio = await actualizarCatalogo(idConvenio, req.body, req.user.id_usuario);
    return res.status(200).json({ convenio });
  } catch (error) {
    console.error('convenio putCatalogo:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al actualizar convenio',
    });
  }
};

const deleteCatalogo = async (req, res) => {
  try {
    const idConvenio = Number(req.body?.id_convenio);
    const convenio = await bajaCatalogo(idConvenio, req.user.id_usuario);
    return res.status(200).json({ convenio });
  } catch (error) {
    console.error('convenio deleteCatalogo:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al dar de baja convenio',
    });
  }
};

const getEmpresaConvenios = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa ?? req.user?.id_empresa);
  try {
    const convenios = await listarEmpresaConvenios(idEmpresa);
    return res.status(200).json({ convenios });
  } catch (error) {
    console.error('convenio getEmpresaConvenios:', error);
    return res.status(500).json({ message: 'Error al listar convenios de empresa' });
  }
};

const postIncorporarEmpresa = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa ?? req.user?.id_empresa);
  const idConvenio = Number(req.body?.id_convenio);
  try {
    const convenio = await incorporarConvenioEmpresa(
      idEmpresa,
      idConvenio,
      req.body,
      req.user.id_usuario,
    );
    return res.status(201).json({ convenio });
  } catch (error) {
    console.error('convenio postIncorporarEmpresa:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al incorporar convenio',
      code: error.code,
    });
  }
};

const putEmpresaConvenio = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa ?? req.user?.id_empresa);
  const idEmpresaConvenio = Number(req.body?.id_empresa_convenio);
  try {
    const convenio = await actualizarEmpresaConvenio(
      idEmpresa,
      idEmpresaConvenio,
      req.body,
      req.user.id_usuario,
    );
    return res.status(200).json({ convenio });
  } catch (error) {
    console.error('convenio putEmpresaConvenio:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al actualizar convenio de empresa',
    });
  }
};

const deleteEmpresaConvenio = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa ?? req.user?.id_empresa);
  const idEmpresaConvenio = Number(req.body?.id_empresa_convenio);
  try {
    const convenio = await bajaEmpresaConvenio(
      idEmpresa,
      idEmpresaConvenio,
      req.user.id_usuario,
    );
    return res.status(200).json({ convenio });
  } catch (error) {
    console.error('convenio deleteEmpresaConvenio:', error);
    return res.status(error.status || 500).json({
      message: error.message || 'Error al retirar convenio de empresa',
    });
  }
};

const getConvenioUsuario = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa ?? req.user?.id_empresa);
  const idUsuario = Number(req.body?.idUsuario ?? req.user?.id_usuario);
  try {
    const convenio = await resolverConvenioUsuario(idEmpresa, idUsuario);
    return res.status(200).json({ convenio });
  } catch (error) {
    console.error('convenio getConvenioUsuario:', error);
    return res.status(500).json({ message: 'Error al resolver convenio' });
  }
};

const postPreviewDiasAusencia = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa ?? req.user?.id_empresa);
  const {
    idUsuario,
    fecha_desde,
    fecha_hasta,
    fraccion_dia,
    hora_ausencia_desde,
    hora_ausencia_hasta,
    tipo,
  } = req.body;

  if (!idUsuario || !fecha_desde || !fecha_hasta) {
    return res.status(400).json({ message: 'Faltan datos para calcular días' });
  }

  try {
    const ausencia = {
      id_usuario: Number(idUsuario),
      empresa_id: idEmpresa,
      fecha_desde,
      fecha_hasta,
      fraccion_dia,
      hora_ausencia_desde,
      hora_ausencia_hasta,
      tipo,
    };
    const [dias, convenio] = await Promise.all([
      calcularDiasConsumoAusencia(ausencia, idEmpresa),
      resolverConvenioUsuario(idEmpresa, Number(idUsuario)),
    ]);
    return res.status(200).json({
      dias,
      modo_conteo: convenio?.reglas?.modo_conteo_vacaciones || 'natural',
      modo_conteo_etiqueta: convenio?.modo_conteo_etiqueta || 'días naturales',
      convenio,
    });
  } catch (error) {
    console.error('convenio postPreviewDiasAusencia:', error);
    return res.status(500).json({ message: 'Error al calcular días' });
  }
};

const getCatalogoItem = async (req, res) => {
  try {
    const convenio = await obtenerCatalogoPorId(Number(req.body?.id_convenio));
    if (!convenio) {
      return res.status(404).json({ message: 'Convenio no encontrado' });
    }
    return res.status(200).json({ convenio });
  } catch (error) {
    console.error('convenio getCatalogoItem:', error);
    return res.status(500).json({ message: 'Error al obtener convenio' });
  }
};

module.exports = {
  getCatalogo,
  getCatalogoItem,
  postCatalogo,
  putCatalogo,
  deleteCatalogo,
  getEmpresaConvenios,
  postIncorporarEmpresa,
  putEmpresaConvenio,
  deleteEmpresaConvenio,
  getConvenioUsuario,
  postPreviewDiasAusencia,
};
