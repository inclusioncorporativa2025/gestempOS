const Empresa = require('../models/Empresa');
const {
  normalizePlanId,
  planIncluyeFeature,
  getPlanLabel,
} = require('../config/plans');

const obtenerPlanEmpresa = async (idEmpresa) => {
  if (!idEmpresa) {
    return normalizePlanId(null);
  }

  const empresa = await Empresa.findByPk(idEmpresa, {
    attributes: ['plan'],
  });

  return normalizePlanId(empresa?.plan);
};

const empresaTieneFeature = async (idEmpresa, featureKey) => {
  const planId = await obtenerPlanEmpresa(idEmpresa);
  return planIncluyeFeature(planId, featureKey);
};

const assertEmpresaTieneFeature = async (idEmpresa, featureKey) => {
  const planId = await obtenerPlanEmpresa(idEmpresa);
  if (!planIncluyeFeature(planId, featureKey)) {
    const error = new Error('Funcionalidad no incluida en el plan contratado');
    error.status = 403;
    error.code = 'PLAN_FEATURE_REQUIRED';
    error.feature = featureKey;
    error.plan = planId;
    error.planLabel = getPlanLabel(planId);
    throw error;
  }
};

module.exports = {
  obtenerPlanEmpresa,
  empresaTieneFeature,
  assertEmpresaTieneFeature,
};
