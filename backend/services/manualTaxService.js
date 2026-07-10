const {
  resolverRegimenImpuestoEmpresa,
  aplicarPorcentajeImpuesto,
} = require('../utils/spanishTax');

const impuestosAutomaticosActivos = () =>
  String(process.env.STRIPE_AUTOMATIC_TAX ?? 'false').toLowerCase() === 'true';

const obtenerTaxRateId = (regimen) => {
  const envKey = regimen.codigo === 'iva_21'
    ? 'STRIPE_TAX_RATE_IVA_21'
    : 'STRIPE_TAX_RATE_EXENTO';

  const taxRateId = String(process.env[envKey] || '').trim();
  if (!taxRateId) {
    const error = new Error(
      `Falta ${envKey} en el servidor. Cree las Tax Rates en Stripe y configúrela en .env`,
    );
    error.status = 503;
    error.code = 'STRIPE_TAX_RATE_NOT_CONFIGURED';
    throw error;
  }

  return taxRateId;
};

/**
 * Resuelve Tax Rate(s) de Stripe según datos fiscales de la empresa (modo manual).
 */
const resolverImpuestoManualEmpresa = (empresa) => {
  if (impuestosAutomaticosActivos()) {
    return null;
  }

  const regimen = resolverRegimenImpuestoEmpresa(empresa);
  const taxRateId = obtenerTaxRateId(regimen);

  return {
    regimen,
    taxRateIds: [taxRateId],
  };
};

const enriquecerPreviewConImpuestoManual = (preview, regimen) => {
  const subtotal = Number(preview.importe_subtotal_eur) || 0;
  const { impuesto, total } = aplicarPorcentajeImpuesto(subtotal, regimen.porcentaje);

  return {
    ...preview,
    importe_subtotal_eur: subtotal,
    importe_iva_eur: impuesto,
    importe_cobrar_ahora_eur: total,
    regimen_impuesto: regimen.codigo,
    regimen_impuesto_etiqueta: regimen.etiqueta,
    porcentaje_impuesto: regimen.porcentaje,
  };
};

module.exports = {
  impuestosAutomaticosActivos,
  resolverImpuestoManualEmpresa,
  enriquecerPreviewConImpuestoManual,
  aplicarPorcentajeImpuesto,
};
