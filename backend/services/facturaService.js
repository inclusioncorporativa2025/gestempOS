const fs = require('fs');
const { sequelize } = require('../config/db');
const Empresa = require('../models/Empresa');
const { LOGO_PATH, BRAND_NAME } = require('../config/brand');
const {
  resolverSerie,
  obtenerDefinicionSerie,
  formatearNumeroFactura,
  formatearNumeroRecibo,
} = require('../config/facturaSeries');
const { renderFacturaHtml: renderTemplate } = require('../utils/facturaTemplate');

const getStripe = () => require('./billingService').getStripe;

const toDateFromUnix = (unix) => (unix ? new Date(unix * 1000) : null);

const mapEstadoStripe = (stripeStatus) => {
  if (stripeStatus === 'paid') return 'pagada';
  if (stripeStatus === 'void') return 'anulada';
  return 'emitida';
};

const mapEstadoApi = (estado) => {
  if (estado === 'pagada') return 'paid';
  if (estado === 'anulada') return 'void';
  return 'open';
};

const formatDireccionCliente = (empresa) => {
  if (!empresa) return null;
  const parts = [
    empresa.direccion,
    [empresa.codigo_postal, empresa.ciudad, empresa.provincia].filter(Boolean).join(' '),
    empresa.pais,
  ].filter(Boolean);
  return parts.join(', ') || null;
};

const obtenerAdminEmail = async (idEmpresa) => {
  const rows = await sequelize.query(
    `SELECT u.email
     FROM m_usuarios u
     INNER JOIN m_usuarios_empresas ue ON ue.id_usuario = u.id_usuario
     WHERE ue.id_empresa = :idEmpresa
       AND ue.tipo_usuario = 3
       AND ue.fecha_baja IS NULL
     ORDER BY ue.fecha_alta ASC
     LIMIT 1`,
    {
      replacements: { idEmpresa },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return rows[0]?.email ?? null;
};

const resolverEmpresaDesdeInvoice = async (invoice) => {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (subscriptionId) {
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      const idEmpresa = Number(sub.metadata?.id_empresa || sub.metadata?.idEmpresa);
      if (idEmpresa) return idEmpresa;
    } catch (error) {
      console.warn('facturaService: no se pudo leer suscripción', error.message);
    }
  }

  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (customerId) {
    const rows = await sequelize.query(
      `SELECT id_empresa FROM empresa_facturacion WHERE stripe_customer_id = :customerId LIMIT 1`,
      {
        replacements: { customerId },
        type: sequelize.QueryTypes.SELECT,
      },
    );
    if (rows[0]?.id_empresa) return rows[0].id_empresa;
  }

  return null;
};

const reservarNumeroFactura = async (fechaEmision, importeTotal, transaction) => {
  const fecha = fechaEmision instanceof Date ? fechaEmision : new Date(fechaEmision);
  const serie = resolverSerie(importeTotal);
  const ejercicio = fecha.getFullYear();

  await sequelize.query(
    `INSERT INTO factura_series (serie, ejercicio, ultimo_numero)
     VALUES (:serie, :ejercicio, 1)
     ON DUPLICATE KEY UPDATE ultimo_numero = ultimo_numero + 1`,
    { replacements: { serie, ejercicio }, transaction },
  );

  const rows = await sequelize.query(
    `SELECT ultimo_numero FROM factura_series
     WHERE serie = :serie AND ejercicio = :ejercicio
     LIMIT 1`,
    {
      replacements: { serie, ejercicio },
      type: sequelize.QueryTypes.SELECT,
      transaction,
    },
  );

  const numeroSecuencial = Number(rows[0]?.ultimo_numero) || 1;

  return {
    numeroFactura: formatearNumeroFactura(serie, ejercicio, numeroSecuencial),
    numeroRecibo: formatearNumeroRecibo(fecha, numeroSecuencial),
    serie,
    ejercicio,
    numeroSecuencial,
  };
};

const mapFacturaRow = (row) => ({
  id: row.id_factura,
  numero: row.numero_factura,
  numero_recibo: row.numero_recibo,
  serie: row.serie,
  serie_label: row.serie ? obtenerDefinicionSerie(row.serie).etiqueta : null,
  ejercicio: row.ejercicio,
  fecha: row.fecha_emision,
  fecha_pago: row.fecha_pago,
  importe: Number(row.importe_total),
  importe_pagado: row.estado === 'pagada' ? Number(row.importe_total) : 0,
  moneda: row.moneda,
  estado: mapEstadoApi(row.estado),
  concepto: row.concepto,
  periodo_desde: row.periodo_desde,
  periodo_hasta: row.periodo_hasta,
  documento_url: `/api/billing/facturas/${row.id_factura}/documento`,
});

const obtenerDatosCliente = async (idEmpresa, stripeCustomerId) => {
  const empresa = await Empresa.findByPk(idEmpresa);
  let email = empresa?.email || (await obtenerAdminEmail(idEmpresa));

  let nombre = empresa?.razon_social || empresa?.nombre_comercial || empresa?.nombre;
  let direccion = formatDireccionCliente(empresa);
  let cif = empresa?.identificador_fiscal || null;

  if (stripeCustomerId) {
    try {
      const customer = await getStripe().customers.retrieve(stripeCustomerId);
      if (customer.name) nombre = customer.name;
      if (customer.email) email = customer.email;
      if (customer.address) {
        const a = customer.address;
        direccion = [
          a.line1,
          a.line2,
          [a.postal_code, a.city, a.state].filter(Boolean).join(' '),
          a.country,
        ].filter(Boolean).join(', ');
      }
    } catch (error) {
      console.warn('facturaService: no se pudo leer cliente Stripe', error.message);
    }
  }

  return {
    cliente_nombre: nombre,
    cliente_email: email,
    cliente_direccion: direccion,
    cliente_cif: cif,
  };
};

const registrarDesdeStripeInvoice = async (idEmpresa, invoice) => {
  if (!idEmpresa || !invoice?.id) return null;

  const existente = await sequelize.query(
    `SELECT id_factura, estado FROM empresa_facturas WHERE stripe_invoice_id = :stripeId LIMIT 1`,
    {
      replacements: { stripeId: invoice.id },
      type: sequelize.QueryTypes.SELECT,
    },
  );

  const estado = mapEstadoStripe(invoice.status);
  const fechaPago = invoice.status_transitions?.paid_at
    ? toDateFromUnix(invoice.status_transitions.paid_at)
    : estado === 'pagada'
      ? toDateFromUnix(invoice.created)
      : null;

  if (existente[0]) {
    await sequelize.query(
      `UPDATE empresa_facturas
       SET estado = :estado,
           fecha_pago = COALESCE(:fechaPago, fecha_pago),
           importe_total = :importeTotal,
           importe_subtotal = :importeSubtotal
       WHERE id_factura = :idFactura`,
      {
        replacements: {
          idFactura: existente[0].id_factura,
          estado,
          fechaPago,
          importeTotal: (invoice.total ?? 0) / 100,
          importeSubtotal: (invoice.subtotal ?? invoice.total ?? 0) / 100,
        },
      },
    );
    return existente[0].id_factura;
  }

  const lines = invoice.lines?.data || [];
  const mainLine = lines[0];
  const concepto = mainLine?.description || `Suscripción ${BRAND_NAME}`;
  const cantidad = Math.max(1, Number(mainLine?.quantity) || 1);
  const precioUnitario = (mainLine?.unit_amount ?? mainLine?.amount ?? 0) / 100;
  const importeTotal = (invoice.total ?? 0) / 100;
  const importeSubtotal = (invoice.subtotal ?? invoice.total ?? 0) / 100;
  const fechaEmision = toDateFromUnix(invoice.created) || new Date();
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  const cliente = await obtenerDatosCliente(idEmpresa, customerId);

  let metodoPago = null;
  if (invoice.charge && typeof invoice.charge === 'string') {
    try {
      const charge = await getStripe().charges.retrieve(invoice.charge);
      metodoPago = charge.payment_method_details?.card
        ? `Tarjeta ···· ${charge.payment_method_details.card.last4}`
        : charge.payment_method_details?.type || null;
    } catch {
      metodoPago = null;
    }
  } else if (importeTotal === 0) {
    metodoPago = 'Periodo de prueba';
  }

  return sequelize.transaction(async (transaction) => {
    const numeracion = await reservarNumeroFactura(fechaEmision, importeTotal, transaction);

    const [, meta] = await sequelize.query(
      `INSERT INTO empresa_facturas (
         id_empresa, numero_factura, numero_recibo, serie, ejercicio, numero_secuencial,
         stripe_invoice_id, estado, fecha_emision, fecha_pago, concepto, cantidad,
         precio_unitario, importe_subtotal, importe_total, moneda,
         periodo_desde, periodo_hasta,
         cliente_nombre, cliente_email, cliente_direccion, cliente_cif, metodo_pago
       ) VALUES (
         :idEmpresa, :numeroFactura, :numeroRecibo, :serie, :ejercicio, :numeroSecuencial,
         :stripeInvoiceId, :estado, :fechaEmision, :fechaPago, :concepto, :cantidad,
         :precioUnitario, :importeSubtotal, :importeTotal, :moneda,
         :periodoDesde, :periodoHasta,
         :clienteNombre, :clienteEmail, :clienteDireccion, :clienteCif, :metodoPago
       )`,
      {
        replacements: {
          idEmpresa,
          numeroFactura: numeracion.numeroFactura,
          numeroRecibo: numeracion.numeroRecibo,
          serie: numeracion.serie,
          ejercicio: numeracion.ejercicio,
          numeroSecuencial: numeracion.numeroSecuencial,
          stripeInvoiceId: invoice.id,
          estado,
          fechaEmision,
          fechaPago,
          concepto: concepto.slice(0, 500),
          cantidad,
          precioUnitario,
          importeSubtotal,
          importeTotal,
          moneda: String(invoice.currency || 'eur').toUpperCase(),
          periodoDesde: toDateFromUnix(invoice.period_start),
          periodoHasta: toDateFromUnix(invoice.period_end),
          clienteNombre: cliente.cliente_nombre,
          clienteEmail: cliente.cliente_email,
          clienteDireccion: cliente.cliente_direccion,
          clienteCif: cliente.cliente_cif,
          metodoPago,
        },
        transaction,
      },
    );

    return meta?.insertId ?? null;
  });
};

const sincronizarFacturasStripe = async (idEmpresa, stripeCustomerId) => {
  if (!stripeCustomerId) return;

  const list = await getStripe().invoices.list({
    customer: stripeCustomerId,
    limit: 24,
  });

  const pendientes = list.data.filter((inv) => inv.status !== 'draft');

  for (const invoice of pendientes) {
    try {
      await registrarDesdeStripeInvoice(idEmpresa, invoice);
    } catch (error) {
      console.warn(`facturaService: sync ${invoice.id}`, error.message);
    }
  }
};

const listarFacturas = async (idEmpresa, { limit = 5 } = {}) => {
  const max = Math.min(Math.max(1, Number(limit) || 5), 100);

  const rows = await sequelize.query(
    `SELECT *
     FROM empresa_facturas
     WHERE id_empresa = :idEmpresa
     ORDER BY fecha_emision DESC, id_factura DESC
     LIMIT :limit`,
    {
      replacements: { idEmpresa, limit: max },
      type: sequelize.QueryTypes.SELECT,
    },
  );

  return {
    facturas: rows.map(mapFacturaRow),
  };
};

const obtenerFactura = async (idEmpresa, idFactura) => {
  const rows = await sequelize.query(
    `SELECT *
     FROM empresa_facturas
     WHERE id_empresa = :idEmpresa AND id_factura = :idFactura
     LIMIT 1`,
    {
      replacements: { idEmpresa, idFactura },
      type: sequelize.QueryTypes.SELECT,
    },
  );

  return rows[0] ?? null;
};

const logoBase64 = () => {
  if (!fs.existsSync(LOGO_PATH)) return null;
  const buffer = fs.readFileSync(LOGO_PATH);
  return `data:image/png;base64,${buffer.toString('base64')}`;
};

const renderFacturaHtml = (factura) => renderTemplate(factura, logoBase64());

module.exports = {
  resolverEmpresaDesdeInvoice,
  registrarDesdeStripeInvoice,
  sincronizarFacturasStripe,
  listarFacturas,
  obtenerFactura,
  renderFacturaHtml,
};
