const { ROLES } = require('../middleware/authMiddleware');
const { assertEmpresaTieneFeature, empresaTieneFeature } = require('../services/planService');
const {
  obtenerResumenVacaciones,
  guardarCupoAnio,
  registrarAjusteManual,
  obtenerSaldoAnio,
} = require('../services/vacacionesService');
const { vacacionesSoportaSaldo } = require('../utils/vacacionesCompat');

const asegurarFeatureVacaciones = async (idEmpresa) => {
  const tiene = await empresaTieneFeature(idEmpresa, 'vacaciones');
  if (!tiene) {
    const error = new Error('Las vacaciones requieren el plan RRHH o Completo');
    error.code = 'PLAN_FEATURE_REQUIRED';
    throw error;
  }
};

const puedeVerUsuario = (req, idUsuario) => {
  const tipo = Number(req.user?.tipo_usuario);
  if (tipo === ROLES.EMPLEADO) {
    return Number(idUsuario) === Number(req.user?.id_usuario);
  }
  return true;
};

const getSaldoVacaciones = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuario = Number(req.body?.idUsuario);
  const anio = req.body?.anio;

  if (!idEmpresa || !idUsuario) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }
  if (!puedeVerUsuario(req, idUsuario)) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  try {
    await asegurarFeatureVacaciones(idEmpresa);
    const soporta = await vacacionesSoportaSaldo();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de saldo de vacaciones no está disponible en el servidor',
      });
    }

    const resumen = await obtenerResumenVacaciones(idEmpresa, idUsuario, anio);
    return res.status(200).json(resumen);
  } catch (error) {
    if (error.code === 'PLAN_FEATURE_REQUIRED') {
      return res.status(403).json({ message: error.message, code: error.code });
    }
    return res.status(500).json({
      message: 'Error al obtener el saldo de vacaciones',
      error: error.message,
    });
  }
};

const guardarCupoVacaciones = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuario = Number(req.body?.idUsuario);
  const idUsuarioAccion = req.user?.id_usuario;

  if (!idEmpresa || !idUsuario) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureVacaciones(idEmpresa);
    const soporta = await vacacionesSoportaSaldo();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de saldo de vacaciones no está disponible en el servidor',
      });
    }

    const cupo = await guardarCupoAnio(
      idEmpresa,
      idUsuario,
      req.body,
      idUsuarioAccion,
    );

    const saldo = await obtenerSaldoAnio(idEmpresa, idUsuario, req.body?.anio);

    return res.status(200).json({
      message: 'Cupo de vacaciones guardado',
      cupo,
      saldo,
    });
  } catch (error) {
    if (error.code === 'PLAN_FEATURE_REQUIRED') {
      return res.status(403).json({ message: error.message, code: error.code });
    }
    if (error.code === 'ANIO_REQUERIDO') {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    return res.status(500).json({
      message: 'Error al guardar el cupo de vacaciones',
      error: error.message,
    });
  }
};

const ajustarSaldoVacaciones = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa || req.user.id_empresa);
  const idUsuario = Number(req.body?.idUsuario);
  const { anio, dias, motivo } = req.body;
  const idUsuarioAccion = req.user?.id_usuario;

  if (!idEmpresa || !idUsuario || dias == null) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await asegurarFeatureVacaciones(idEmpresa);
    const soporta = await vacacionesSoportaSaldo();
    if (!soporta) {
      return res.status(503).json({
        message: 'El módulo de saldo de vacaciones no está disponible en el servidor',
      });
    }

    await registrarAjusteManual(
      idEmpresa,
      idUsuario,
      anio,
      dias,
      motivo,
      idUsuarioAccion,
    );

    const resumen = await obtenerResumenVacaciones(idEmpresa, idUsuario, anio);

    return res.status(201).json({
      message: 'Ajuste de vacaciones registrado',
      ...resumen,
    });
  } catch (error) {
    if (error.code === 'PLAN_FEATURE_REQUIRED') {
      return res.status(403).json({ message: error.message, code: error.code });
    }
    if (error.code === 'AJUSTE_CERO' || error.code === 'MOTIVO_REQUERIDO') {
      return res.status(400).json({ message: error.message, code: error.code });
    }
    return res.status(500).json({
      message: 'Error al registrar el ajuste',
      error: error.message,
    });
  }
};

module.exports = {
  getSaldoVacaciones,
  guardarCupoVacaciones,
  ajustarSaldoVacaciones,
};
