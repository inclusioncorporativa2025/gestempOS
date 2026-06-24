const { assertEmpresaTieneFeature } = require('../services/planService');

/**
 * Exige que la empresa activa en el JWT tenga la feature en su plan.
 */
const requirePlanFeature = (featureKey) => async (req, res, next) => {
  try {
    const idEmpresa = Number(req.user?.id_empresa);
    if (!idEmpresa) {
      return res.status(403).json({
        code: 'EMPRESA_REQUIRED',
        message: 'No hay empresa activa en la sesión',
      });
    }

    await assertEmpresaTieneFeature(idEmpresa, featureKey);
    return next();
  } catch (error) {
    if (error.code === 'PLAN_FEATURE_REQUIRED') {
      return res.status(403).json({
        code: error.code,
        feature: error.feature,
        plan: error.plan,
        planLabel: error.planLabel,
        message: error.message,
      });
    }

    console.error('requirePlanFeature:', error);
    return res.status(500).json({ message: 'Error al validar el plan' });
  }
};

module.exports = {
  requirePlanFeature,
};
