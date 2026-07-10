const Stripe = require('stripe');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const Plan = require('../models/Plan');
const {
  normalizePlanId,
  getPlanMinLicencias,
  getPlanLabel,
} = require('../config/plans');
const { camposPlanEmpresa } = require('./planCatalogService');
const { obtenerDisponibilidadLicencias } = require('../repositorios/usuariosEmpresasRepository');
const { TRIAL_DAYS, obtenerEstadoTrialEmpresa } = require('./trialService');
const {
  calcularPeriodoLegacy,
  periodoLegacyVigente,
} = require('../utils/legacyBillingPeriod');
const {
  impuestosAutomaticosActivos,
  resolverImpuestoManualEmpresa,
  aplicarPorcentajeImpuesto,
  obtenerCamposFiscalesFaltantes,
  assertDatosFiscalesEmpresa,
} = require('./manualTaxService');
const { resolverRegimenImpuestoEmpresa } = require('../utils/spanishTax');

let stripeClient = null;

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const error = new Error('Stripe no está configurado en el servidor');
    error.status = 503;
    error.code = 'STRIPE_NOT_CONFIGURED';
    throw error;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: '2024-06-20',
      timeout: 25_000,
      maxNetworkRetries: 1,
    });
  }
  return stripeClient;
};

const toDate = (unixSeconds) => {
  if (unixSeconds == null) return null;
  const n = Number(unixSeconds);
  if (!Number.isFinite(n)) return null;
  return new Date(n * 1000);
};

const resolverPlanPorPriceId = async (priceId) => {
  if (!priceId) return null;

  const row = await Plan.findOne({
    where: {
      [Op.or]: [
        { stripe_price_id_mensual: priceId },
        { stripe_price_id_anual: priceId },
      ],
    },
    raw: true,
  });

  if (!row) return null;

  const ciclo =
    row.stripe_price_id_anual === priceId ? 'anual' : 'mensual';

  return { row, ciclo };
};

const obtenerFacturacionCompleta = async (idEmpresa) => {
  const rows = await sequelize.query(
    `SELECT *
     FROM empresa_facturacion
     WHERE id_empresa = :idEmpresa
     LIMIT 1`,
    {
      replacements: { idEmpresa },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return rows[0] ?? null;
};

const registrarHistorialPlan = async (params) => {
  try {
    const {
      idEmpresa,
      idPlanAnterior,
      idPlanNuevo,
      licenciasAnterior,
      licenciasNuevo,
      modoFacturacion,
      motivo,
      stripeEventId,
      usuarioAlta,
    } = params;

    if (
      idPlanAnterior === idPlanNuevo &&
      Number(licenciasAnterior) === Number(licenciasNuevo)
    ) {
      return;
    }

    await sequelize.query(
    `INSERT INTO empresa_plan_historial (
       id_empresa, id_plan_anterior, id_plan_nuevo,
       licencias_anterior, licencias_nuevo, modo_facturacion,
       motivo, stripe_event_id, usuario_alta
     ) VALUES (
       :idEmpresa, :idPlanAnterior, :idPlanNuevo,
       :licenciasAnterior, :licenciasNuevo, :modoFacturacion,
       :motivo, :stripeEventId, :usuarioAlta
     )`,
    {
      replacements: {
        idEmpresa,
        idPlanAnterior: idPlanAnterior ?? null,
        idPlanNuevo,
        licenciasAnterior: licenciasAnterior ?? null,
        licenciasNuevo: licenciasNuevo ?? null,
        modoFacturacion: modoFacturacion ?? 'stripe',
        motivo: motivo ?? 'webhook',
        stripeEventId: stripeEventId ?? null,
        usuarioAlta: usuarioAlta ?? null,
      },
    },
  );
  } catch (error) {
    console.warn('empresa_plan_historial no actualizado:', error.message);
  }
};

const sincronizarSuscripcion = async (subscription, { motivo, stripeEventId } = {}) => {
  const sub = typeof subscription === 'string'
    ? await getStripe().subscriptions.retrieve(subscription, { expand: ['items.data.price'] })
    : subscription;

  const idEmpresa = Number(
    sub.metadata?.id_empresa ||
    sub.metadata?.idEmpresa ||
    null,
  );

  let empresaId = idEmpresa;

  if (!empresaId) {
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (customerId) {
      const rows = await sequelize.query(
        `SELECT id_empresa FROM empresa_facturacion WHERE stripe_customer_id = :customerId LIMIT 1`,
        {
          replacements: { customerId },
          type: sequelize.QueryTypes.SELECT,
        },
      );
      empresaId = rows[0]?.id_empresa ?? null;
    }
  }

  if (!empresaId) {
    console.warn('billingService: suscripción sin id_empresa resoluble', sub.id);
    return null;
  }

  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const quantity = Math.max(1, Number(item?.quantity) || 1);
  const planInfo = await resolverPlanPorPriceId(priceId);

  const facturacionPrev = await obtenerFacturacionCompleta(empresaId);
  const empresa = await Empresa.findByPk(empresaId);

  const planFields = planInfo
    ? camposPlanEmpresa(planInfo.row)
    : empresa
      ? { id_plan: empresa.id_plan, plan: normalizePlanId(empresa.plan) }
      : null;

  if (!planFields) {
    return null;
  }

  await sequelize.query(
    `UPDATE empresa_facturacion
     SET stripe_customer_id = COALESCE(:customerId, stripe_customer_id),
         stripe_subscription_id = :subscriptionId,
         stripe_subscription_item_id = :subscriptionItemId,
         stripe_price_id = :priceId,
         estado_suscripcion = :estado,
         ciclo_facturacion = :ciclo,
         current_period_start = :periodStart,
         current_period_end = :periodEnd,
         trial_ends_at = :trialEnd,
         cancel_at_period_end = :cancelAtPeriodEnd,
         licencias_facturadas = :licencias,
         id_plan = :idPlan,
         modo_facturacion = 'stripe',
         stripe_synced_at = NOW()
     WHERE id_empresa = :idEmpresa`,
    {
      replacements: {
        idEmpresa: empresaId,
        customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
        subscriptionId: sub.id,
        subscriptionItemId: item?.id ?? null,
        priceId,
        estado: sub.status,
        ciclo: planInfo?.ciclo ?? null,
        periodStart: toDate(sub.current_period_start),
        periodEnd: toDate(sub.current_period_end),
        trialEnd: toDate(sub.trial_end),
        cancelAtPeriodEnd: sub.cancel_at_period_end ? 1 : 0,
        licencias: quantity,
        idPlan: planFields.id_plan,
      },
    },
  );

  await Empresa.update(
    {
      id_plan: planFields.id_plan,
      plan: planFields.plan,
      licencias: quantity,
    },
    { where: { id_empresa: empresaId } },
  );

  await registrarHistorialPlan({
    idEmpresa: empresaId,
    idPlanAnterior: facturacionPrev?.id_plan ?? empresa?.id_plan,
    idPlanNuevo: planFields.id_plan,
    licenciasAnterior: facturacionPrev?.licencias_facturadas ?? empresa?.licencias,
    licenciasNuevo: quantity,
    modoFacturacion: 'stripe',
    motivo: motivo ?? 'subscription_sync',
    stripeEventId,
  });

  return { idEmpresa: empresaId, subscriptionId: sub.id, plan: planFields.plan };
};

const marcarEventoWebhook = async (event, estado, { idEmpresa, errorMensaje } = {}) => {
  try {
    await sequelize.query(
      `INSERT INTO stripe_webhook_events (
         stripe_event_id, tipo, estado, id_empresa, error_mensaje, payload_json, procesado_en
       ) VALUES (
         :eventId, :tipo, :estado, :idEmpresa, :errorMensaje, :payload, :procesadoEn
       )
       ON DUPLICATE KEY UPDATE
         estado = VALUES(estado),
         id_empresa = COALESCE(VALUES(id_empresa), id_empresa),
         error_mensaje = VALUES(error_mensaje),
         procesado_en = VALUES(procesado_en)`,
      {
        replacements: {
          eventId: event.id,
          tipo: event.type,
          estado,
          idEmpresa: idEmpresa ?? null,
          errorMensaje: errorMensaje ?? null,
          payload: JSON.stringify({ id: event.id, type: event.type, livemode: event.livemode }),
          procesadoEn: estado === 'processed' ? new Date() : null,
        },
      },
    );
  } catch (error) {
    console.error('No se pudo registrar evento webhook:', error.message);
  }
};

const eventoYaProcesado = async (eventId) => {
  const rows = await sequelize.query(
    `SELECT estado FROM stripe_webhook_events WHERE stripe_event_id = :eventId LIMIT 1`,
    {
      replacements: { eventId },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return rows[0]?.estado === 'processed';
};

const procesarWebhookEvent = async (event) => {
  if (await eventoYaProcesado(event.id)) {
    return { ignored: true };
  }

  await marcarEventoWebhook(event, 'received');

  let idEmpresa = null;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        idEmpresa = Number(session.metadata?.id_empresa || session.metadata?.idEmpresa);
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (idEmpresa && customerId) {
          await sequelize.query(
            `UPDATE empresa_facturacion
             SET stripe_customer_id = :customerId
             WHERE id_empresa = :idEmpresa`,
            { replacements: { idEmpresa, customerId } },
          );
        }

        if (subscriptionId) {
          const result = await sincronizarSuscripcion(subscriptionId, {
            motivo: 'checkout.session.completed',
            stripeEventId: event.id,
          });
          idEmpresa = result?.idEmpresa ?? idEmpresa;
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        if (event.type === 'customer.subscription.deleted') {
          idEmpresa = Number(sub.metadata?.id_empresa || sub.metadata?.idEmpresa);
          if (!idEmpresa && sub.customer) {
            const rows = await sequelize.query(
              `SELECT id_empresa FROM empresa_facturacion WHERE stripe_customer_id = :customerId LIMIT 1`,
              {
                replacements: { customerId: sub.customer },
                type: sequelize.QueryTypes.SELECT,
              },
            );
            idEmpresa = rows[0]?.id_empresa ?? null;
          }
          if (idEmpresa) {
            await sequelize.query(
              `UPDATE empresa_facturacion
               SET estado_suscripcion = 'canceled',
                   stripe_synced_at = NOW()
               WHERE id_empresa = :idEmpresa`,
              { replacements: { idEmpresa } },
            );
          }
        } else {
          const result = await sincronizarSuscripcion(sub, {
            motivo: event.type,
            stripeEventId: event.id,
          });
          idEmpresa = result?.idEmpresa ?? null;
        }
        break;
      }

      case 'invoice.finalized':
      case 'invoice.paid': {
        const invoice = event.data.object;
        const {
          registrarDesdeStripeInvoice,
          resolverEmpresaDesdeInvoice,
        } = require('./facturaService');

        const empresaFactura = await resolverEmpresaDesdeInvoice(invoice);
        if (empresaFactura) {
          await registrarDesdeStripeInvoice(empresaFactura, invoice);
          idEmpresa = empresaFactura;
        }

        if (event.type === 'invoice.paid' && invoice.subscription) {
          const result = await sincronizarSuscripcion(invoice.subscription, {
            motivo: 'invoice.paid',
            stripeEventId: event.id,
          });
          idEmpresa = result?.idEmpresa ?? idEmpresa;
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await getStripe().subscriptions.retrieve(invoice.subscription);
          const result = await sincronizarSuscripcion(sub, {
            motivo: 'invoice.payment_failed',
            stripeEventId: event.id,
          });
          idEmpresa = result?.idEmpresa ?? null;
        }
        break;
      }

      default:
        await marcarEventoWebhook(event, 'ignored', { idEmpresa });
        return { ignored: true };
    }

    await marcarEventoWebhook(event, 'processed', { idEmpresa });
    return { processed: true, idEmpresa };
  } catch (error) {
    await marcarEventoWebhook(event, 'failed', {
      idEmpresa,
      errorMensaje: error.message?.slice(0, 500),
    });
    throw error;
  }
};

const limpiarReferenciasStripeEmpresa = async (idEmpresa) => {
  await sequelize.query(
    `UPDATE empresa_facturacion
     SET stripe_customer_id = NULL,
         stripe_subscription_id = NULL,
         stripe_subscription_item_id = NULL,
         stripe_price_id = NULL,
         estado_suscripcion = NULL,
         stripe_synced_at = NOW()
     WHERE id_empresa = :idEmpresa`,
    { replacements: { idEmpresa } },
  );
};

const customerStripeExiste = async (customerId) => {
  if (!customerId) {
    return false;
  }

  try {
    const customer = await getStripe().customers.retrieve(customerId);
    return Boolean(customer?.id) && !customer.deleted;
  } catch (error) {
    if (error.code === 'resource_missing') {
      return false;
    }
    throw error;
  }
};

const nombreFacturacionEmpresa = (empresa) =>
  String(empresa?.razon_social || empresa?.nombre_comercial || empresa?.nombre || '').trim();

const normalizarIdentificadorFiscal = (valor) =>
  String(valor || '').trim().toUpperCase().replace(/[\s-]/g, '');

const tipoTaxIdStripe = (identificador) => {
  const id = normalizarIdentificadorFiscal(identificador);
  return /^[ABCDEFGHJNPQRSUVW]/.test(id) ? 'es_cif' : 'es_nif';
};

const registrarTaxIdCustomerStripe = async (customerId, empresa) => {
  const identificador = normalizarIdentificadorFiscal(empresa?.identificador_fiscal);
  if (!identificador) {
    return;
  }

  const existentes = await getStripe().customers.listTaxIds(customerId, { limit: 20 });
  const yaRegistrado = existentes.data.some(
    (taxId) => normalizarIdentificadorFiscal(taxId.value) === identificador,
  );

  if (yaRegistrado) {
    return;
  }

  await getStripe().customers.createTaxId(customerId, {
    type: tipoTaxIdStripe(identificador),
    value: identificador,
  });
};

const sincronizarCustomerStripeDesdeEmpresa = async (customerId, empresa, email) => {
  const name = nombreFacturacionEmpresa(empresa);
  const cp = String(empresa?.codigo_postal || '').replace(/\s/g, '');

  await getStripe().customers.update(customerId, {
    email: email || undefined,
    name: name || undefined,
    address: {
      line1: String(empresa?.direccion || '').trim() || undefined,
      city: String(empresa?.ciudad || '').trim() || undefined,
      postal_code: cp || undefined,
      state: String(empresa?.provincia || '').trim() || undefined,
      country: 'ES',
    },
  });

  registrarTaxIdCustomerStripe(customerId, empresa).catch((error) => {
    console.warn('billingService: no se pudo registrar el CIF/NIF en Stripe', error.message);
  });
};

const obtenerOCrearCustomer = async (idEmpresa, email, nombre) => {
  const facturacion = await obtenerFacturacionCompleta(idEmpresa);

  if (facturacion?.stripe_customer_id) {
    const existe = await customerStripeExiste(facturacion.stripe_customer_id);
    if (existe) {
      return facturacion.stripe_customer_id;
    }
    await limpiarReferenciasStripeEmpresa(idEmpresa);
  }

  const customer = await getStripe().customers.create({
    email,
    name: nombre || undefined,
    metadata: { id_empresa: String(idEmpresa) },
  });

  await sequelize.query(
    `UPDATE empresa_facturacion
     SET stripe_customer_id = :customerId
     WHERE id_empresa = :idEmpresa`,
    { replacements: { idEmpresa, customerId: customer.id } },
  );

  return customer.id;
};

const validarPrecioSuscripcion = async (priceId, ciclo) => {
  let price;
  try {
    price = await getStripe().prices.retrieve(priceId);
  } catch (error) {
    const err = new Error('El precio de Stripe configurado no existe o no es accesible');
    err.status = 503;
    err.code = 'STRIPE_PRICE_NOT_FOUND';
    throw err;
  }

  if (!price.active) {
    const err = new Error('El precio de Stripe está desactivado');
    err.status = 503;
    err.code = 'STRIPE_PRICE_INACTIVE';
    throw err;
  }

  if (price.type !== 'recurring' || !price.recurring) {
    const err = new Error(
      'El precio anual en Stripe no es una suscripción recurrente. '
      + 'Crea un precio con facturación anual recurrente y actualiza planes.stripe_price_id_anual.',
    );
    err.status = 503;
    err.code = 'STRIPE_PRICE_NOT_RECURRING';
    throw err;
  }

  const intervaloEsperado = ciclo === 'anual' ? 'year' : 'month';
  if (price.recurring.interval !== intervaloEsperado) {
    const err = new Error(
      `El precio de Stripe (${priceId}) no coincide con el ciclo ${ciclo}. `
      + 'Revisa planes.stripe_price_id_mensual y stripe_price_id_anual.',
    );
    err.status = 503;
    err.code = 'STRIPE_PRICE_INTERVAL_MISMATCH';
    throw err;
  }

  return price;
};

const resolverUrlsCheckout = () => {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '');
  return {
    successUrl:
      process.env.STRIPE_SUCCESS_URL
      || `${base}/facturacion/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: process.env.STRIPE_CANCEL_URL || `${base}/facturacion/cancelado`,
  };
};

const aplicarImpuestoManualLineItem = (lineItem, taxRateIds) => ({
  ...lineItem,
  tax_rates: taxRateIds,
});

const crearCheckoutSession = async ({
  idEmpresa,
  email,
  nombre,
  planCodigo,
  ciclo,
  licencias,
  aplicarTrial = false,
}) => {
  const planId = normalizePlanId(planCodigo);
  const minLicencias = getPlanMinLicencias(planId);
  const qty = Number(licencias);

  if (!Number.isFinite(qty) || qty < minLicencias) {
    const error = new Error(
      `El plan ${getPlanLabel(planId)} requiere al menos ${minLicencias} licencias`,
    );
    error.status = 400;
    throw error;
  }

  const planRow = await Plan.findOne({ where: { codigo: planId }, raw: true });
  if (!planRow) {
    const error = new Error('Plan no encontrado');
    error.status = 404;
    throw error;
  }

  const cicloNormalizado = ciclo === 'anual' ? 'anual' : 'mensual';
  const esAnual = cicloNormalizado === 'anual';
  const priceId = esAnual
    ? planRow.stripe_price_id_anual
    : planRow.stripe_price_id_mensual;

  if (!priceId) {
    const error = new Error('Precio de Stripe no configurado para este plan');
    error.status = 503;
    throw error;
  }

  await validarPrecioSuscripcion(priceId, cicloNormalizado);

  const empresa = await Empresa.findByPk(idEmpresa);
  if (!empresa) {
    const error = new Error('Empresa no encontrada');
    error.status = 404;
    throw error;
  }

  assertDatosFiscalesEmpresa(empresa);
  const impuestoManual = resolverImpuestoManualEmpresa(empresa);

  const { successUrl, cancelUrl } = resolverUrlsCheckout();

  const customerId = await obtenerOCrearCustomer(
    idEmpresa,
    email,
    nombreFacturacionEmpresa(empresa) || nombre,
  );
  await sincronizarCustomerStripeDesdeEmpresa(customerId, empresa, email);

  const lineItem = impuestoManual
    ? aplicarImpuestoManualLineItem({ price: priceId, quantity: qty }, impuestoManual.taxRateIds)
    : { price: priceId, quantity: qty };

  const sessionParams = {
    mode: 'subscription',
    customer: customerId,
    line_items: [lineItem],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      id_empresa: String(idEmpresa),
      plan_codigo: planId,
      ciclo: cicloNormalizado,
    },
    subscription_data: {
      metadata: {
        id_empresa: String(idEmpresa),
        plan_codigo: planId,
      },
      ...(aplicarTrial ? { trial_period_days: TRIAL_DAYS } : {}),
      ...(impuestoManual ? { default_tax_rates: impuestoManual.taxRateIds } : {}),
    },
  };

  if (aplicarTrial) {
    sessionParams.payment_method_collection = 'always';
  }

  if (impuestosAutomaticosActivos()) {
    sessionParams.automatic_tax = { enabled: true };
    sessionParams.billing_address_collection = 'required';
    sessionParams.tax_id_collection = { enabled: true };
    sessionParams.customer_update = { address: 'auto', name: 'auto' };
  }

  const couponAnual = process.env.STRIPE_COUPON_ANUAL;
  if (esAnual && couponAnual) {
    sessionParams.discounts = [{ coupon: couponAnual }];
  }

  const session = await getStripe().checkout.sessions.create(sessionParams);
  return { url: session.url, sessionId: session.id };
};

const crearPortalSession = async (idEmpresa, returnUrl) => {
  const facturacion = await obtenerFacturacionCompleta(idEmpresa);
  if (!facturacion?.stripe_customer_id) {
    const error = new Error('No hay suscripción de Stripe para esta empresa');
    error.status = 400;
    error.code = 'NO_STRIPE_CUSTOMER';
    throw error;
  }

  const customerId = facturacion.stripe_customer_id;
  const existe = await customerStripeExiste(customerId);
  if (!existe) {
    await limpiarReferenciasStripeEmpresa(idEmpresa);
    const error = new Error(
      'El cliente de Stripe ya no existe. Vuelva a activar la suscripción desde Facturación.',
    );
    error.status = 400;
    error.code = 'STRIPE_CUSTOMER_NOT_FOUND';
    throw error;
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || process.env.STRIPE_SUCCESS_URL?.split('?')[0] || process.env.FRONTEND_URL,
  });

  return { url: session.url };
};

const ESTADOS_CANCELABLES = new Set(['active', 'trialing']);
const ESTADOS_AMPLIABLES = new Set(['active', 'trialing']);

const buscarSuscripcionStripeDelCliente = async (customerId) => {
  if (!customerId) return null;

  const list = await getStripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });

  const prioridad = ['trialing', 'active', 'past_due'];
  for (const status of prioridad) {
    const sub = list.data.find((item) => item.status === status);
    if (sub) return sub;
  }

  return list.data[0] ?? null;
};

const asegurarSuscripcionSincronizada = async (idEmpresa) => {
  const facturacion = await obtenerFacturacionCompleta(idEmpresa);
  if (!facturacion) return facturacion;

  if (facturacion.stripe_subscription_id) {
    return facturacion;
  }

  if (!facturacion.stripe_customer_id) {
    return facturacion;
  }

  try {
    const sub = await buscarSuscripcionStripeDelCliente(facturacion.stripe_customer_id);
    if (sub) {
      await sincronizarSuscripcion(sub, { motivo: 'asegurar_suscripcion_sincronizada' });
      return obtenerFacturacionCompleta(idEmpresa);
    }
  } catch (error) {
    console.warn('No se pudo sincronizar suscripción desde Stripe:', error.message);
  }

  return facturacion;
};

const sincronizarFacturacionLegacy = async (idEmpresa, empresa) => {
  let facturacion = await obtenerFacturacionCompleta(idEmpresa);
  if (!facturacion || facturacion.stripe_subscription_id) {
    return facturacion;
  }

  const modo = String(facturacion.modo_facturacion || '').toLowerCase();
  if (modo === 'trial' || modo === 'stripe') {
    return facturacion;
  }

  if (!empresa?.fecha_alta) {
    return facturacion;
  }

  const cicloLegacy = 'anual';
  const cicloGuardado = String(facturacion.ciclo_facturacion || '').toLowerCase();
  const vigente = periodoLegacyVigente(
    facturacion.current_period_start,
    facturacion.current_period_end,
  );

  if (vigente && modo === 'legacy' && cicloGuardado === cicloLegacy) {
    return facturacion;
  }

  if (vigente && modo !== 'legacy') {
    await sequelize.query(
      `UPDATE empresa_facturacion
       SET modo_facturacion = 'legacy',
           ciclo_facturacion = :ciclo
       WHERE id_empresa = :idEmpresa`,
      { replacements: { idEmpresa, ciclo: cicloLegacy } },
    );
    return obtenerFacturacionCompleta(idEmpresa);
  }

  const { start, end } = calcularPeriodoLegacy(empresa.fecha_alta, cicloLegacy);

  await sequelize.query(
    `UPDATE empresa_facturacion
     SET modo_facturacion = 'legacy',
         ciclo_facturacion = :ciclo,
         current_period_start = :periodStart,
         current_period_end = :periodEnd
     WHERE id_empresa = :idEmpresa`,
    {
      replacements: {
        idEmpresa,
        ciclo: cicloLegacy,
        periodStart: start,
        periodEnd: end,
      },
    },
  );

  return obtenerFacturacionCompleta(idEmpresa);
};

const obtenerSuscripcionStripe = async (idEmpresa) => {
  const facturacion = await asegurarSuscripcionSincronizada(idEmpresa);
  if (!facturacion?.stripe_subscription_id) {
    const error = new Error('No hay suscripción de Stripe para esta empresa');
    error.status = 400;
    error.code = 'NO_STRIPE_SUBSCRIPTION';
    throw error;
  }
  return facturacion;
};

const cancelarSuscripcion = async (idEmpresa) => {
  const facturacion = await obtenerSuscripcionStripe(idEmpresa);
  const estado = String(facturacion.estado_suscripcion || '').toLowerCase();

  if (!ESTADOS_CANCELABLES.has(estado)) {
    const error = new Error('La suscripción no se puede cancelar en este estado');
    error.status = 400;
    error.code = 'SUBSCRIPTION_NOT_CANCELABLE';
    throw error;
  }

  if (facturacion.cancel_at_period_end) {
    return {
      cancel_at_period_end: true,
      current_period_end: facturacion.current_period_end,
    };
  }

  if (estado === 'trialing') {
    const sub = await getStripe().subscriptions.cancel(
      facturacion.stripe_subscription_id,
    );

    await sincronizarSuscripcion(sub, { motivo: 'cancel_trial_inmediato' });

    return {
      cancelada_inmediata: true,
      acceso_cortado: true,
      estado_suscripcion: 'canceled',
    };
  }

  const sub = await getStripe().subscriptions.update(
    facturacion.stripe_subscription_id,
    { cancel_at_period_end: true },
  );

  await sincronizarSuscripcion(sub, { motivo: 'cancel_at_period_end' });

  return {
    cancel_at_period_end: true,
    current_period_end: toDate(sub.current_period_end),
  };
};

const reactivarSuscripcion = async (idEmpresa) => {
  const facturacion = await obtenerSuscripcionStripe(idEmpresa);

  if (!facturacion.cancel_at_period_end) {
    const error = new Error('La suscripción no está programada para cancelarse');
    error.status = 400;
    error.code = 'SUBSCRIPTION_NOT_PENDING_CANCEL';
    throw error;
  }

  const sub = await getStripe().subscriptions.update(
    facturacion.stripe_subscription_id,
    { cancel_at_period_end: false },
  );

  await sincronizarSuscripcion(sub, { motivo: 'reactivar_suscripcion' });

  return { cancel_at_period_end: false };
};

const puedeAmpliarLicenciasStripe = (facturacion) => {
  if (!facturacion?.stripe_subscription_id) {
    return false;
  }
  const estado = String(facturacion.estado_suscripcion || '').toLowerCase();
  return ESTADOS_AMPLIABLES.has(estado);
};

const resolverPriceIdPlan = async (planCodigo, ciclo) => {
  const planId = normalizePlanId(planCodigo);
  const planRow = await Plan.findOne({
    where: { codigo: planId, activo: true },
    raw: true,
  });

  if (!planRow) {
    const error = new Error('Plan no encontrado o no disponible');
    error.status = 404;
    error.code = 'PLAN_NOT_FOUND';
    throw error;
  }

  const cicloNormalizado = ciclo === 'anual' ? 'anual' : 'mensual';
  const priceId = cicloNormalizado === 'anual'
    ? planRow.stripe_price_id_anual
    : planRow.stripe_price_id_mensual;

  if (!priceId) {
    const error = new Error('Precio de Stripe no configurado para este plan');
    error.status = 503;
    error.code = 'STRIPE_PRICE_NOT_CONFIGURED';
    throw error;
  }

  await validarPrecioSuscripcion(priceId, cicloNormalizado);

  return { planRow, planId, priceId, ciclo: cicloNormalizado };
};

const resolverCambioPlanStripe = async (idEmpresa, { plan: planCodigo, licencias } = {}) => {
  const facturacion = await asegurarSuscripcionSincronizada(idEmpresa);
  if (!puedeAmpliarLicenciasStripe(facturacion)) {
    const error = new Error(
      'No hay suscripción de Stripe activa. Activa la suscripción en Facturación.',
    );
    error.status = 400;
    error.code = 'NO_STRIPE_SUBSCRIPTION';
    throw error;
  }

  const empresa = await Empresa.findByPk(idEmpresa);
  if (!empresa) {
    const error = new Error('Empresa no encontrada');
    error.status = 404;
    throw error;
  }

  assertDatosFiscalesEmpresa(empresa);

  const planActual = normalizePlanId(empresa.plan);
  const ciclo = String(facturacion.ciclo_facturacion || 'mensual').toLowerCase() === 'anual'
    ? 'anual'
    : 'mensual';

  const { planRow, planId: planNuevo, priceId } = await resolverPriceIdPlan(planCodigo, ciclo);
  const disponibilidad = await obtenerDisponibilidadLicencias(idEmpresa);
  const minLicencias = Math.max(
    getPlanMinLicencias(planNuevo),
    Number(planRow.min_licencias) || getPlanMinLicencias(planNuevo),
  );
  const licenciasAnterior = Number(empresa.licencias) || Number(facturacion.licencias_facturadas) || 0;

  let nuevaCantidad = licencias != null ? Number(licencias) : licenciasAnterior;
  if (!Number.isFinite(nuevaCantidad)) {
    nuevaCantidad = licenciasAnterior;
  }

  nuevaCantidad = Math.max(nuevaCantidad, minLicencias, disponibilidad.usadas);

  if (nuevaCantidad < disponibilidad.usadas) {
    const error = new Error(
      `No puede reducir por debajo de las licencias en uso (${disponibilidad.usadas})`,
    );
    error.status = 400;
    error.code = 'LICENCIAS_EN_USO';
    throw error;
  }

  let itemId = facturacion.stripe_subscription_item_id;
  const subscriptionId = facturacion.stripe_subscription_id;
  const customerId = facturacion.stripe_customer_id;

  if (!itemId) {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    itemId = sub.items?.data?.[0]?.id ?? null;
  }

  if (!itemId) {
    const error = new Error('No se encontró el ítem de suscripción en Stripe');
    error.status = 400;
    error.code = 'SUBSCRIPTION_ITEM_NOT_FOUND';
    throw error;
  }

  if (!customerId) {
    const error = new Error('No hay cliente de Stripe asociado');
    error.status = 400;
    error.code = 'NO_STRIPE_CUSTOMER';
    throw error;
  }

  await sincronizarCustomerStripeDesdeEmpresa(customerId, empresa, empresa.email);

  return {
    facturacion,
    empresa,
    planActual,
    planNuevo,
    planRow,
    priceId,
    ciclo,
    nuevaCantidad,
    licenciasAnterior,
    itemId,
    subscriptionId,
    customerId,
    disponibilidad,
  };
};

const centimosAEur = (centimos) => Number(centimos || 0) / 100;

const mapearLineasPreviewStripe = (invoice) =>
  (invoice?.lines?.data || []).map((line) => ({
    descripcion: line.description || 'Concepto',
    importe_eur: centimosAEur(line.amount),
    prorrateo: Boolean(line.proration),
  }));

const previewCambiarPlanStripe = async (idEmpresa, { plan: planCodigo, licencias } = {}) => {
  const resolved = await resolverCambioPlanStripe(idEmpresa, { plan: planCodigo, licencias });
  const {
    planActual,
    planNuevo,
    priceId,
    ciclo,
    nuevaCantidad,
    licenciasAnterior,
    itemId,
    subscriptionId,
    customerId,
  } = resolved;

  if (planNuevo === planActual && nuevaCantidad === licenciasAnterior) {
    return {
      sin_cambios: true,
      plan: planNuevo,
      plan_anterior: planActual,
      plan_label: getPlanLabel(planNuevo),
      licencias: nuevaCantidad,
      licencias_anterior: licenciasAnterior,
      importe_cobrar_ahora_eur: 0,
      importe_subtotal_eur: 0,
      importe_iva_eur: 0,
      moneda: 'EUR',
      lineas: [],
      ciclo_facturacion: ciclo,
    };
  }

  const previewParams = {
    customer: customerId,
    subscription: subscriptionId,
    subscription_details: {
      items: [{ id: itemId, price: priceId, quantity: nuevaCantidad }],
      proration_behavior: 'create_prorations',
    },
  };

  if (impuestosAutomaticosActivos()) {
    previewParams.automatic_tax = { enabled: true };
  }

  const preview = await getStripe().invoices.createPreview(previewParams);

  const importeIva = (preview.total_tax_amounts || []).reduce(
    (sum, tax) => sum + Number(tax.amount || 0),
    0,
  );

  return {
    sin_cambios: false,
    plan: planNuevo,
    plan_anterior: planActual,
    plan_label: getPlanLabel(planNuevo),
    licencias: nuevaCantidad,
    licencias_anterior: licenciasAnterior,
    importe_cobrar_ahora_eur: centimosAEur(preview.amount_due),
    importe_subtotal_eur: centimosAEur(preview.subtotal),
    importe_iva_eur: centimosAEur(importeIva),
    moneda: String(preview.currency || 'eur').toUpperCase(),
    lineas: mapearLineasPreviewStripe(preview),
    ciclo_facturacion: ciclo,
  };
};

const cambiarPlanStripe = async (idEmpresa, { plan: planCodigo, licencias } = {}) => {
  const resolved = await resolverCambioPlanStripe(idEmpresa, { plan: planCodigo, licencias });
  const {
    planActual,
    planNuevo,
    priceId,
    ciclo,
    nuevaCantidad,
    licenciasAnterior,
    itemId,
    subscriptionId,
    disponibilidad,
  } = resolved;

  if (planNuevo === planActual && nuevaCantidad === licenciasAnterior) {
    const error = new Error('No hay cambios en el plan ni en las licencias');
    error.status = 400;
    error.code = 'PLAN_SIN_CAMBIO';
    throw error;
  }

  const impuestoManual = resolverImpuestoManualEmpresa(resolved.empresa);
  const updateItem = { id: itemId, price: priceId, quantity: nuevaCantidad };
  if (impuestoManual) {
    updateItem.tax_rates = impuestoManual.taxRateIds;
  }

  await getStripe().subscriptions.update(subscriptionId, {
    items: [updateItem],
    proration_behavior: 'create_prorations',
    ...(impuestoManual ? { default_tax_rates: impuestoManual.taxRateIds } : {}),
    metadata: {
      id_empresa: String(idEmpresa),
      plan_codigo: planNuevo,
    },
  });

  await sincronizarSuscripcion(subscriptionId, { motivo: 'cambiar_plan' });

  const actualizada = await obtenerDisponibilidadLicencias(idEmpresa);

  return {
    plan: planNuevo,
    plan_anterior: planActual,
    plan_label: getPlanLabel(planNuevo),
    licencias: nuevaCantidad,
    licencias_anterior: licenciasAnterior,
    licencias_usadas: actualizada.usadas,
    plazas_libres: actualizada.plazasLibres,
    ciclo_facturacion: ciclo,
    prorrateo: true,
  };
};

const ampliarLicenciasStripe = async (idEmpresa, { licencias } = {}) => {
  const disponibilidad = await obtenerDisponibilidadLicencias(idEmpresa);

  if (disponibilidad.disponible) {
    const error = new Error('Ya hay plazas disponibles');
    error.status = 400;
    error.code = 'LICENCIAS_DISPONIBLES';
    throw error;
  }

  const facturacion = await asegurarSuscripcionSincronizada(idEmpresa);
  if (!puedeAmpliarLicenciasStripe(facturacion)) {
    const error = new Error(
      'No hay suscripción de Stripe activa. Activa la suscripción en Facturación.',
    );
    error.status = 400;
    error.code = 'NO_STRIPE_SUBSCRIPTION';
    throw error;
  }

  const empresa = await Empresa.findByPk(idEmpresa);
  if (!empresa) {
    const error = new Error('Empresa no encontrada');
    error.status = 404;
    throw error;
  }

  assertDatosFiscalesEmpresa(empresa);

  const planId = normalizePlanId(empresa.plan);
  const minLicencias = getPlanMinLicencias(planId);
  const licenciasAnterior = disponibilidad.licencias;

  let nuevaCantidad = licencias != null ? Number(licencias) : disponibilidad.usadas + 1;
  if (!Number.isFinite(nuevaCantidad)) {
    nuevaCantidad = disponibilidad.usadas + 1;
  }

  nuevaCantidad = Math.max(nuevaCantidad, minLicencias, disponibilidad.usadas + 1);

  if (nuevaCantidad <= licenciasAnterior) {
    const error = new Error('La cantidad debe ser mayor que las licencias contratadas');
    error.status = 400;
    error.code = 'LICENCIAS_SIN_CAMBIO';
    throw error;
  }

  let itemId = facturacion.stripe_subscription_item_id;
  const subscriptionId = facturacion.stripe_subscription_id;

  if (!itemId) {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    itemId = sub.items?.data?.[0]?.id ?? null;
  }

  if (!itemId) {
    const error = new Error('No se encontró el ítem de suscripción en Stripe');
    error.status = 400;
    error.code = 'SUBSCRIPTION_ITEM_NOT_FOUND';
    throw error;
  }

  const impuestoManual = resolverImpuestoManualEmpresa(empresa);
  const updateItem = { id: itemId, quantity: nuevaCantidad };
  if (impuestoManual) {
    updateItem.tax_rates = impuestoManual.taxRateIds;
  }

  await sincronizarCustomerStripeDesdeEmpresa(
    facturacion.stripe_customer_id,
    empresa,
    empresa.email,
  );

  await getStripe().subscriptions.update(subscriptionId, {
    items: [updateItem],
    proration_behavior: 'create_prorations',
    ...(impuestoManual ? { default_tax_rates: impuestoManual.taxRateIds } : {}),
  });

  await sincronizarSuscripcion(subscriptionId, { motivo: 'ampliar_licencias' });

  const actualizada = await obtenerDisponibilidadLicencias(idEmpresa);

  return {
    licencias: nuevaCantidad,
    licencias_anterior: licenciasAnterior,
    licencias_usadas: actualizada.usadas,
    plazas_libres: actualizada.plazasLibres,
    prorrateo: true,
  };
};

const obtenerEstadoFacturacion = async (idEmpresa) => {
  const empresa = await Empresa.findByPk(idEmpresa);
  if (!empresa) {
    const error = new Error('Empresa no encontrada');
    error.status = 404;
    throw error;
  }

  const facturacion = await asegurarSuscripcionSincronizada(idEmpresa);
  const facturacionLegacy = await sincronizarFacturacionLegacy(idEmpresa, empresa);
  const facturacionFinal = facturacionLegacy ?? facturacion;
  const licencias = await obtenerDisponibilidadLicencias(idEmpresa);
  const trial = await obtenerEstadoTrialEmpresa(idEmpresa);
  const planCodigo = normalizePlanId(empresa.plan);
  const estadoSuscripcion = String(facturacionFinal?.estado_suscripcion || '').toLowerCase();
  const enPruebaStripe = estadoSuscripcion === 'trialing';
  const esLegacy = String(facturacionFinal?.modo_facturacion || '').toLowerCase() === 'legacy';
  const camposFiscalesFaltantes = impuestosAutomaticosActivos()
    ? []
    : obtenerCamposFiscalesFaltantes(empresa);
  const regimenImpuesto = impuestosAutomaticosActivos()
    ? null
    : resolverRegimenImpuestoEmpresa(empresa);

  return {
    plan: planCodigo,
    plan_label: getPlanLabel(planCodigo),
    id_plan: empresa.id_plan,
    licencias: empresa.licencias,
    licencias_usadas: licencias.usadas,
    plazas_libres: licencias.plazasLibres,
    modo_facturacion: facturacionFinal?.modo_facturacion ?? 'legacy',
    estado_suscripcion: facturacionFinal?.estado_suscripcion ?? null,
    ciclo_facturacion: facturacionFinal?.ciclo_facturacion ?? (esLegacy ? 'anual' : null),
    trial_ends_at: facturacionFinal?.trial_ends_at ?? null,
    current_period_start: facturacionFinal?.current_period_start ?? null,
    current_period_end: facturacionFinal?.current_period_end ?? null,
    cancel_at_period_end: Boolean(facturacionFinal?.cancel_at_period_end),
    tiene_stripe: Boolean(facturacionFinal?.stripe_subscription_id),
    puede_ampliar_stripe: puedeAmpliarLicenciasStripe(facturacionFinal),
    puede_cambiar_plan: puedeAmpliarLicenciasStripe(facturacionFinal),
    puede_portal: Boolean(facturacionFinal?.stripe_customer_id),
    puede_cancelar:
      Boolean(facturacionFinal?.stripe_subscription_id)
      && ESTADOS_CANCELABLES.has(estadoSuscripcion),
    en_prueba_stripe: enPruebaStripe,
    es_legacy: esLegacy,
    min_licencias: getPlanMinLicencias(planCodigo),
    trial,
    datos_fiscales_completos: camposFiscalesFaltantes.length === 0,
    campos_fiscales_faltantes: camposFiscalesFaltantes,
    regimen_impuesto: regimenImpuesto?.codigo ?? null,
    regimen_impuesto_etiqueta: regimenImpuesto?.etiqueta ?? null,
  };
};

const verificarSesionCheckout = async (sessionId) => {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  return {
    status: session.status,
    paymentStatus: session.payment_status,
    subscriptionId: session.subscription,
    customerId: session.customer,
    idEmpresa: session.metadata?.id_empresa ?? null,
  };
};

const listarFacturasEmitidas = async (idEmpresa, { limit = 5 } = {}) => {
  const { listarFacturas, sincronizarFacturasStripe } = require('./facturaService');
  const facturacion = await obtenerFacturacionCompleta(idEmpresa);

  if (facturacion?.stripe_customer_id) {
    try {
      await sincronizarFacturasStripe(idEmpresa, facturacion.stripe_customer_id);
    } catch (error) {
      console.warn('facturaService: error sincronizando facturas', error.message);
    }
  }

  const resultado = await listarFacturas(idEmpresa, { limit });

  return {
    ...resultado,
    tiene_cliente_stripe: Boolean(facturacion?.stripe_customer_id),
  };
};

const listarFacturasPagadas = listarFacturasEmitidas;

const crearCheckoutTrialPendiente = async (idEmpresa, { email, nombre } = {}) => {
  const facturacion = await obtenerFacturacionCompleta(idEmpresa);
  if (!facturacion) {
    const error = new Error('No se encontró la facturación de la empresa');
    error.status = 404;
    throw error;
  }

  if (facturacion.modo_facturacion !== 'trial' || facturacion.stripe_subscription_id) {
    const error = new Error('Esta empresa no tiene un pago de prueba pendiente');
    error.status = 400;
    error.code = 'CHECKOUT_NOT_AVAILABLE';
    throw error;
  }

  const empresa = await Empresa.findByPk(idEmpresa);
  if (!empresa) {
    const error = new Error('Empresa no encontrada');
    error.status = 404;
    throw error;
  }

  const licencias = Number(facturacion.licencias_facturadas) || Number(empresa.licencias) || 1;

  return crearCheckoutSession({
    idEmpresa,
    email,
    nombre,
    planCodigo: normalizePlanId(empresa.plan),
    ciclo: 'mensual',
    licencias,
    aplicarTrial: true,
  });
};

module.exports = {
  getStripe,
  resolverPlanPorPriceId,
  sincronizarSuscripcion,
  procesarWebhookEvent,
  crearCheckoutSession,
  crearCheckoutTrialPendiente,
  crearPortalSession,
  cancelarSuscripcion,
  reactivarSuscripcion,
  ampliarLicenciasStripe,
  cambiarPlanStripe,
  previewCambiarPlanStripe,
  puedeAmpliarLicenciasStripe,
  obtenerEstadoFacturacion,
  verificarSesionCheckout,
  listarFacturasPagadas,
  listarFacturasEmitidas,
  obtenerFacturacionCompleta,
};
