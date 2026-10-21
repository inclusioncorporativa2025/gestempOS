const Empresa = require('../models/Empresa');
const {
  getStripe,
  asegurarSuscripcionSincronizada,
  puedeAmpliarLicenciasStripe,
  crearPreviewInvoiceActualizacionSuscripcion,
  calcularImporteCobrarPreviewStripe,
  filtrarLineasPreviewPorPrecio,
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

const moduloPlain = (modulo) => (modulo?.get ? modulo.get({ plain: true }) : modulo);

const precioPlazaModuloPorCiclo = (modulo, ciclo) => {
  const row = moduloPlain(modulo);
  const esAnual = String(ciclo || '').toLowerCase() === 'anual';
  if (esAnual) {
    const anual = Number(row.precio_anual_eur);
    if (Number.isFinite(anual) && anual > 0) return anual;
    const mensual = Number(row.precio_mensual_eur);
    return Number.isFinite(mensual) ? mensual * 12 : 0;
  }
  return Number(row.precio_mensual_eur) || 0;
};

const resolverPriceIdModulo = (modulo, ciclo) => {
  const row = moduloPlain(modulo);
  const anual = String(ciclo || '').toLowerCase() === 'anual';
  const priceId = anual
    ? row.stripe_price_id_anual
    : row.stripe_price_id_mensual;
  if (!priceId) {
    const error = new Error('Precio de Stripe no configurado para este módulo');
    error.status = 503;
    error.code = 'MARKETPLACE_STRIPE_PRICE_NOT_CONFIGURED';
    throw error;
  }
  return priceId;
};

/** Ciclo de la suscripción del plan (Stripe), no el del add-on. */
const resolverCicloFacturacionStripe = async (facturacion) => {
  const fallback = String(facturacion?.ciclo_facturacion || 'mensual').toLowerCase() === 'anual'
    ? 'anual'
    : 'mensual';
  const subscriptionId = facturacion?.stripe_subscription_id;
  if (!subscriptionId) {
    return {
      ciclo: fallback,
      currentPeriodEnd: facturacion?.current_period_end ?? null,
    };
  }

  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });
    const items = sub.items?.data || [];
    const itemPlan = items.find((line) => line.id === facturacion.stripe_subscription_item_id)
      || items.find((line) => line.price?.recurring?.interval)
      || items[0];
    const interval = itemPlan?.price?.recurring?.interval;
    let ciclo = fallback;
    if (interval === 'year') ciclo = 'anual';
    else if (interval === 'month') ciclo = 'mensual';

    const periodEnd = sub.current_period_end != null
      ? new Date(Number(sub.current_period_end) * 1000)
      : facturacion.current_period_end;

    return { ciclo, currentPeriodEnd: periodEnd };
  } catch (error) {
    console.warn('marketplaceContratar: no se pudo leer ciclo Stripe:', error.message);
    return {
      ciclo: fallback,
      currentPeriodEnd: facturacion?.current_period_end ?? null,
    };
  }
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

  const { ciclo, currentPeriodEnd } = await resolverCicloFacturacionStripe(facturacion);
  const priceId = resolverPriceIdModulo(modulo, ciclo);
  const precioPlazaCicloEur = precioPlazaModuloPorCiclo(modulo, ciclo);
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
    currentPeriodEnd,
    priceId,
    precioPlazaCicloEur,
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

  const lineas = filtrarLineasPreviewPorPrecio(preview, [ctx.priceId]);
  const importeCobrar = calcularImporteCobrarPreviewStripe(preview, {
    priceIdsProrrateo: [ctx.priceId],
  });
  const importeSubtotal = lineas.reduce((sum, line) => sum + Number(line.importe_eur || 0), 0);

  const importeRecurrenteEur = ctx.precioPlazaCicloEur * ctx.plazasObjetivo;

  return {
    codigo_modulo: ctx.modulo.codigo,
    plazas_actuales: ctx.plazasActuales,
    plazas_objetivo: ctx.plazasObjetivo,
    plazas_anadir: ctx.plazasObjetivo - ctx.plazasActuales,
    ciclo_facturacion: ctx.ciclo,
    precio_plaza_ciclo_eur: ctx.precioPlazaCicloEur,
    precio_mensual_eur: Number(moduloPlain(ctx.modulo).precio_mensual_eur),
    importe_recurrente_ciclo_eur: importeRecurrenteEur,
    proxima_factura: ctx.currentPeriodEnd
      ? new Date(ctx.currentPeriodEnd).toISOString()
      : null,
    importe_cobrar_ahora_eur: importeCobrar,
    importe_subtotal_eur: importeSubtotal,
    importe_iva_eur: null,
    moneda: String(preview.currency || 'eur').toUpperCase(),
    lineas,
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
