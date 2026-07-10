const {
  resolverRegimenImpuestoEmpresa,
  aplicarPorcentajeImpuesto,
} = require('../utils/spanishTax');

const CAMPOS_FISCALES = [
  { key: 'identificador_fiscal', etiqueta: 'CIF / NIF' },
  { key: 'razon_social', etiqueta: 'Razón social', fallback: 'nombre' },
  { key: 'direccion', etiqueta: 'Dirección' },
  { key: 'codigo_postal', etiqueta: 'Código postal' },
  { key: 'ciudad', etiqueta: 'Ciudad' },
  { key: 'provincia', etiqueta: 'Provincia' },
];

const valorCampoFiscal = (empresa, campo) => {
  const raw = empresa?.[campo.key] ?? (campo.fallback ? empresa?.[campo.fallback] : null);
  return String(raw || '').trim();
};

const obtenerCamposFiscalesFaltantes = (empresa) =>
  CAMPOS_FISCALES.filter((campo) => !valorCampoFiscal(empresa, campo)).map((campo) => ({
    campo: campo.key,
    etiqueta: campo.etiqueta,
  }));

const assertDatosFiscalesEmpresa = (empresa) => {
  if (impuestosAutomaticosActivos()) {
    return;
  }

  const faltantes = obtenerCamposFiscalesFaltantes(empresa);
  if (faltantes.length === 0) {
    return;
  }

  const error = new Error(
    'Complete los datos fiscales de la empresa antes de activar o modificar la suscripción.',
  );
  error.status = 400;
  error.code = 'DATOS_FISCALES_INCOMPLETOS';
  error.campos_faltantes = faltantes;
  throw error;
};

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
  obtenerCamposFiscalesFaltantes,
  assertDatosFiscalesEmpresa,
  CAMPOS_FISCALES,
};
