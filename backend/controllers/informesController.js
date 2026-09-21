const { assertEmpresaTieneFeature } = require('../services/planService');
const { calcularInformeProductividadEmpresa } = require('../services/productividadInformesService');

const getInformeProductividad = async (req, res) => {
  const idEmpresa = Number(req.body?.idEmpresa ?? req.body?.id_empresa ?? req.user?.id_empresa);
  const mes = req.body?.mes;

  if (!idEmpresa) {
    return res.status(400).json({ message: 'idEmpresa es obligatorio' });
  }

  if (!mes) {
    return res.status(400).json({ message: 'mes es obligatorio (formato YYYY-MM)' });
  }

  try {
    await assertEmpresaTieneFeature(idEmpresa, 'informes_productividad');

    const informe = await calcularInformeProductividadEmpresa(idEmpresa, mes);
    return res.status(200).json(informe);
  } catch (error) {
    if (error.code === 'PLAN_FEATURE_REQUIRED') {
      return res.status(403).json({
        message: error.message,
        code: error.code,
        feature: error.feature,
        plan: error.plan,
        planLabel: error.planLabel,
      });
    }

    console.error('Error getInformeProductividad:', error.message);
    return res.status(500).json({ message: 'Error al generar el informe de productividad' });
  }
};

module.exports = {
  getInformeProductividad,
};
