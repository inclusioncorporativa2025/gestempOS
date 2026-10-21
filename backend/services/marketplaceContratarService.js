const Empresa = require('../models/Empresa');
const {
  getStripe,
  asegurarSuscripcionSincronizada,
  puedeAmpliarLicenciasStripe,
  crearPreviewInvoiceActualizacionSuscripcion,
  calcularImporteCobrarPreviewStripe,
  mapearLineasPreviewStripe,
} = require('./billingService');
const {
  impuestosAutomaticosActivos,
  resolverImpuestoManualEmpresa,
  assertDatosFiscalesEmpresa,
} = require('./manualTaxService');
const {
  obtenerModuloPorCodigo,
  obtenerEmpresaModuloRowHistorico,
  contarAsientosActivos,
  listarEstadoEmpresa,
  CODIGO_ALERTAS,
  DEFAULT_CONFIG_ALERTAS,
} = require('./marketplaceModuloService');
const MarketplaceEmpresaModulo = require('../models/MarketplaceEmpresaModulo');

const MIN_PLAZAS = 1;
const MAX_PLAZAS = 500;

const normalizarPlazasObjetivo = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
};

const resolverPriceIdModulo = (modulo, ciclo) => {
  const anual = String(ciclo || '').toLowerCase() === 'anual';
  const priceId = anual
    ? modulo.stripe_price_id_anual
    : modulo.stripe_price_id_mensual;
  if (!priceId) {
    const error = new Error('Precio de Stripe no configurado para este módulo');
    error.status = 503;
    error.code = 'MARKETPLACE_STRIPE_PRICE_NOT_CONFIGURED';
    throw error;
  }
  return priceId;
};

const construirLineaItemMarketplace = ({ itemId, priceId, quantity, taxRateIds }) => {
  const base = itemId
    ? { id: itemId, quantity }
    : { price: priceId, quantity };
  if (taxRateIds?.length) {
    return { ...base, tax_rates: taxRateIds };
  }
  return base;
};

const resolverItemMarketplaceEnSuscripcion = (subscription, { itemId, priceId }) => {
  const items = subscription?.items?.data || [];
  if (itemId) {
    const hit = items.find((line) => line.id === itemId);
    if (hit) return hit;
  }
  return items.find((line) => line.price?.id === priceId) ?? null;
};

const resolverContextoContratar = async (idEmpresa, codigoModulo, plazasObjetivoRaw) => {
  const plazasObjetivo = normalizarPlazasObjetivo(plazasObjetivoRaw);
  if (plazasObjetivo == null || plazasObjetivo < MIN_PLAZAS || plazasObjetivo > MAX_PLAZAS) {
    const error = new Error(`Indica entre ${MIN_PLAZAS} y ${MAX_PLAZAS} plazas`);
    error.status = 400;
    error.code = 'MARKETPLACE_PLAZAS_INVALIDAS';
    throw error;
  }

  const modulo = await obtenerModuloPorCodigo(codigoModulo);
  if (!modulo) {
    const error = new Error('Módulo no encontrado en el catálogo');
    error.status = 404;
    throw error;
  }

  const empresa = await Empresa.findByPk(idEmpresa);
  if (!empresa) {
    const error = new Error('Empresa no encontrada');
    error.status = 404;
    throw error;
  }

  assertDatosFiscalesEmpresa(empresa);

  const facturacion = await asegurarSuscripcionSincronizada(idEmpresa);
  if (!puedeAmpliarLicenciasStripe(facturacion)) {
    const error = new Error(
      'No hay suscripción de Stripe activa. Configura el plan en Facturación antes de contratar módulos.',
    );
    error.status = 400;
    error.code = 'NO_STRIPE_SUBSCRIPTION';
    throw error;
  }

  const ciclo = String(facturacion.ciclo_facturacion || 'mensual').toLowerCase() === 'anual'
    ? 'anual'
    : 'mensual';
  const priceId = resolverPriceIdModulo(modulo, ciclo);
  const subscriptionId = facturacion.stripe_subscription_id;
  const customerId = facturacion.stripe_customer_id;

  const rowHistorico = await obtenerEmpresaModuloRowHistorico(idEmpresa, modulo.id_modulo);
  const plazasActuales = rowHistorico?.fecha_baja
    ? 0
    : Math.max(0, Number(rowHistorico?.licencias_facturadas) || 0);
  const usuariosAsignados = await contarAsientosActivos(idEmpresa, modulo.id_modulo);

  if (plazasObjetivo < usuariosAsignados) {
    const error = new Error(
      `No puedes bajar de ${usuariosAsignados} plazas: hay ${usuariosAsignados} usuario(s) con el módulo asignado`,
    );
    error.status = 400;
    error.code = 'MARKETPLACE_PLAZAS_EN_USO';
    throw error;
  }

  if (plazasObjetivo === plazasActuales) {
    const error = new Error('El número de plazas es igual al ya contratado');
    error.status = 400;
    error.code = 'MARKETPLACE_PLAZAS_SIN_CAMBIO';
    throw error;
  }

  const itemId = rowHistorico?.fecha_baja ? null : (rowHistorico?.stripe_subscription_item_id ?? null);
  const impuestoManual = resolverImpuestoManualEmpresa(empresa);
  const previewItems = [
    construirLineaItemMarketplace({
      itemId,
      priceId,
      quantity: plazasObjetivo,
      taxRateIds: impuestoManual?.taxRateIds,
    }),
  ];

  return {
    modulo,
    empresa,
    facturacion,
    ciclo,
    priceId,
    subscriptionId,
    customerId,
    plazasActuales,
    plazasObjetivo,
    usuariosAsignados,
    itemId,
    previewItems,
    impuestoManual,
    rowHistorico,
  };
};

const previewContratarPlazasModulo = async (idEmpresa, codigoModulo, plazasObjetivo) => {
  const ctx = await resolverContextoContratar(idEmpresa, codigoModulo, plazasObjetivo);

  const preview = await crearPreviewInvoiceActualizacionSuscripcion({
    subscriptionId: ctx.subscriptionId,
    customerId: ctx.customerId,
    previewItems: ctx.previewItems,
    automaticTax: impuestosAutomaticosActivos(),
  });

  const importeIva = (preview.total_tax_amounts || []).reduce(
    (sum, tax) => sum + Number(tax.amount || 0),
    0,
  );

  return {
    codigo_modulo: ctx.modulo.codigo,
    plazas_actuales: ctx.plazasActuales,
    plazas_objetivo: ctx.plazasObjetivo,
    plazas_anadir: ctx.plazasObjetivo - ctx.plazasActuales,
    ciclo_facturacion: ctx.ciclo,
    precio_mensual_eur: Number(ctx.modulo.precio_mensual_eur),
    importe_cobrar_ahora_eur: calcularImporteCobrarPreviewStripe(preview),
    importe_subtotal_eur: Number(preview.subtotal || 0) / 100,
    importe_iva_eur: importeIva / 100,
    moneda: String(preview.currency || 'eur').toUpperCase(),
    lineas: mapearLineasPreviewStripe(preview),
  };
};

const persistirContratoPlazas = async ({
  idEmpresa,
  modulo,
  plazasObjetivo,
  stripeItemId,
  idUsuarioAlta,
  rowHistorico,
}) => {
  const config = {
    ...(modulo.codigo === CODIGO_ALERTAS ? DEFAULT_CONFIG_ALERTAS : {}),
    ...(rowHistorico?.config_json && typeof rowHistorico.config_json === 'object'
      ? rowHistorico.config_json
      : {}),
  };
  const ahora = new Date();

  if (rowHistorico) {
    await rowHistorico.update({
      estado: 'active',
      licencias_facturadas: plazasObjetivo,
      stripe_subscription_item_id: stripeItemId,
      config_json: config,
      fecha_baja: null,
      fecha_modificacion: ahora,
      usuario_baja: null,
      usuario_alta: idUsuarioAlta ?? rowHistorico.usuario_alta,
    });
    return;
  }

  await MarketplaceEmpresaModulo.create({
    id_empresa: idEmpresa,
    id_modulo: modulo.id_modulo,
    estado: 'active',
    licencias_facturadas: plazasObjetivo,
    stripe_subscription_item_id: stripeItemId,
    config_json: config,
    fecha_alta: ahora,
    usuario_alta: idUsuarioAlta ?? null,
  });
};

const contratarPlazasModulo = async ({
  idEmpresa,
  codigoModulo,
  plazasObjetivo,
  idUsuarioAlta,
}) => {
  const ctx = await resolverContextoContratar(idEmpresa, codigoModulo, plazasObjetivo);

  await getStripe().subscriptions.update(ctx.subscriptionId, {
    items: ctx.previewItems,
    proration_behavior: 'create_prorations',
    billing_cycle_anchor: 'unchanged',
    ...(ctx.impuestoManual ? { default_tax_rates: ctx.impuestoManual.taxRateIds } : {}),
  });

  const sub = await getStripe().subscriptions.retrieve(ctx.subscriptionId, {
    expand: ['items.data.price'],
  });
  const item = resolverItemMarketplaceEnSuscripcion(sub, {
    itemId: ctx.itemId,
    priceId: ctx.priceId,
  });

  if (!item?.id) {
    const error = new Error('No se encontró el ítem del módulo en la suscripción de Stripe');
    error.status = 500;
    error.code = 'MARKETPLACE_STRIPE_ITEM_NOT_FOUND';
    throw error;
  }

  await persistirContratoPlazas({
    idEmpresa,
    modulo: ctx.modulo,
    plazasObjetivo: ctx.plazasObjetivo,
    stripeItemId: item.id,
    idUsuarioAlta,
    rowHistorico: ctx.rowHistorico,
  });

  const modulos = await listarEstadoEmpresa(idEmpresa);

  return {
    codigo_modulo: ctx.modulo.codigo,
    plazas: ctx.plazasObjetivo,
    plazas_anterior: ctx.plazasActuales,
    stripe_subscription_item_id: item.id,
    modulos,
  };
};

module.exports = {
  MIN_PLAZAS,
  MAX_PLAZAS,
  previewContratarPlazasModulo,
  contratarPlazasModulo,
};
