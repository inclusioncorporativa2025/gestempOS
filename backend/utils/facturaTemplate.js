const { BRAND_NAME } = require('../config/brand');
const { ISSUER, formatDireccionCompleta } = require('../config/issuer');
const { obtenerDefinicionSerie } = require('../config/facturaSeries');

const formatFecha = (value) => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatEuro = (amount) =>
  Number(amount || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const renderFacturaHtml = (factura, logoDataUri) => {
  const serieDef = obtenerDefinicionSerie(factura.serie);
  const titulo = serieDef.documentoTitulo;
  const pagado = factura.estado === 'pagada';
  const fechaPago = factura.fecha_pago || factura.fecha_emision;
  const importe = Number(factura.importe_total);
  const simbolo = factura.moneda === 'EUR' ? '€' : `${factura.moneda} `;

  const resumenPago = pagado
    ? `${simbolo}${formatEuro(importe)} pagado el ${formatFecha(fechaPago)}`
    : `${simbolo}${formatEuro(importe)} pendiente de pago`;

  const clienteLineas = [
    factura.cliente_nombre,
    factura.cliente_direccion,
    factura.cliente_email,
    factura.cliente_cif ? `CIF/NIF: ${factura.cliente_cif}` : null,
  ].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(titulo)} ${escapeHtml(factura.numero_factura)}</title>
  <style>
    :root {
      --ink: #0a2540;
      --muted: #425466;
      --line: #e6ebf1;
      --accent: #2ba9e0;
      --accent-2: #e0529c;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 48px 32px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--ink);
      background: #fff;
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      max-width: 720px;
      margin: 0 auto;
    }
    .top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 32px;
      margin-bottom: 40px;
    }
    .brand-mark {
      width: 88px;
      height: 88px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .doc-title {
      margin: 0 0 20px;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.1;
      color: var(--ink);
    }
    .meta-grid {
      display: grid;
      gap: 6px;
      font-size: 14px;
      line-height: 1.5;
    }
    .meta-row {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 12px;
    }
    .meta-row dt {
      margin: 0;
      color: var(--muted);
      font-weight: 500;
    }
    .meta-row dd {
      margin: 0;
      color: var(--ink);
      font-weight: 500;
    }
    .serie-tag {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #f6f9fc;
      border: 1px solid var(--line);
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .addresses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 36px;
      padding-bottom: 32px;
      border-bottom: 1px solid var(--line);
    }
    .address-block h2 {
      margin: 0 0 10px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .address-block p {
      margin: 0;
      font-size: 14px;
      line-height: 1.65;
      color: var(--ink);
    }
    .address-block strong {
      font-weight: 600;
    }
    .amount-headline {
      margin: 0 0 28px;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    .lines {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    .lines thead th {
      padding: 0 0 10px;
      border-bottom: 1px solid var(--ink);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
      text-align: left;
    }
    .lines thead th.num { text-align: right; }
    .lines tbody td {
      padding: 16px 0;
      border-bottom: 1px solid var(--line);
      font-size: 14px;
      vertical-align: top;
      color: var(--ink);
    }
    .lines tbody td.num {
      text-align: right;
      white-space: nowrap;
      color: var(--muted);
    }
    .lines tbody td.desc {
      padding-right: 24px;
      line-height: 1.5;
    }
    .totals-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 36px;
    }
    .totals {
      width: 260px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      color: var(--muted);
    }
    .totals-row strong {
      color: var(--ink);
      font-weight: 600;
    }
    .totals-row.total {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      font-size: 15px;
      font-weight: 700;
      color: var(--ink);
    }
    .history {
      margin-top: 8px;
    }
    .history h2 {
      margin: 0 0 14px;
      font-size: 16px;
      font-weight: 700;
      color: var(--ink);
    }
    .history-table {
      width: 100%;
      border-collapse: collapse;
    }
    .history-table th {
      padding: 0 0 10px;
      border-bottom: 1px solid var(--line);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
      text-align: left;
    }
    .history-table th.num { text-align: right; }
    .history-table td {
      padding: 14px 0;
      font-size: 14px;
      color: var(--ink);
      border-bottom: 1px solid var(--line);
    }
    .history-table td.num { text-align: right; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
      font-size: 12px;
      line-height: 1.6;
      color: var(--muted);
    }
    .footer-bar {
      height: 3px;
      margin-top: 28px;
      border-radius: 2px;
      background: linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%);
    }
    .toolbar {
      margin-top: 28px;
    }
    .toolbar button {
      appearance: none;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(10, 37, 64, 0.06);
    }
    .toolbar button:hover {
      background: #f6f9fc;
    }
    @media print {
      body { padding: 0; }
      .toolbar { display: none; }
      .footer-bar { display: none; }
    }
    @media (max-width: 640px) {
      body { padding: 24px 16px; }
      .top, .addresses { grid-template-columns: 1fr; display: block; }
      .brand-mark { margin-bottom: 20px; }
      .meta-row { grid-template-columns: 1fr; gap: 2px; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div>
        <h1 class="doc-title">${escapeHtml(titulo)}</h1>
        <dl class="meta-grid">
          <div class="meta-row">
            <dt>Nº factura</dt>
            <dd>${escapeHtml(factura.numero_factura)}</dd>
          </div>
          ${factura.numero_recibo ? `
          <div class="meta-row">
            <dt>Nº recibo</dt>
            <dd>${escapeHtml(factura.numero_recibo)}</dd>
          </div>` : ''}
          <div class="meta-row">
            <dt>${pagado ? 'Fecha de pago' : 'Fecha de emisión'}</dt>
            <dd>${escapeHtml(formatFecha(pagado ? fechaPago : factura.fecha_emision))}</dd>
          </div>
          ${factura.ejercicio ? `
          <div class="meta-row">
            <dt>Serie / Ejercicio</dt>
            <dd>${escapeHtml(factura.serie)} / ${escapeHtml(factura.ejercicio)}</dd>
          </div>` : ''}
        </dl>
        ${factura.serie ? `<span class="serie-tag">Serie ${escapeHtml(serieDef.etiqueta)}</span>` : ''}
      </div>
      ${logoDataUri ? `<img class="brand-mark" src="${logoDataUri}" alt="${escapeHtml(BRAND_NAME)}" />` : ''}
    </div>

    <div class="addresses">
      <div class="address-block">
        <h2>Emisor</h2>
        <p>
          <strong>${escapeHtml(ISSUER.razon_social)}</strong><br />
          ${escapeHtml(formatDireccionCompleta())}<br />
          ${escapeHtml(ISSUER.telefono)}<br />
          ${escapeHtml(ISSUER.email)}
          ${ISSUER.cif ? `<br />CIF: ${escapeHtml(ISSUER.cif)}` : ''}
        </p>
      </div>
      <div class="address-block">
        <h2>Facturar a</h2>
        <p>
          ${clienteLineas.map((linea) => `${escapeHtml(linea)}<br />`).join('')}
        </p>
      </div>
    </div>

    <p class="amount-headline">${escapeHtml(resumenPago)}</p>

    <table class="lines">
      <thead>
        <tr>
          <th>Descripción</th>
          <th class="num">Cant.</th>
          <th class="num">Precio unit.</th>
          <th class="num">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="desc">${escapeHtml(factura.concepto)}</td>
          <td class="num">${escapeHtml(factura.cantidad)}</td>
          <td class="num">${simbolo}${formatEuro(factura.precio_unitario)}</td>
          <td class="num">${simbolo}${formatEuro(importe)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals">
        <div class="totals-row">
          <span>Subtotal</span>
          <strong>${simbolo}${formatEuro(factura.importe_subtotal)}</strong>
        </div>
        <div class="totals-row total">
          <span>Total</span>
          <strong>${simbolo}${formatEuro(importe)}</strong>
        </div>
      </div>
    </div>

    ${pagado ? `
    <section class="history">
      <h2>Historial de pago</h2>
      <table class="history-table">
        <thead>
          <tr>
            <th>Método de pago</th>
            <th>Fecha</th>
            <th class="num">Importe pagado</th>
            <th class="num">Nº recibo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${escapeHtml(factura.metodo_pago || '—')}</td>
            <td>${escapeHtml(formatFecha(fechaPago))}</td>
            <td class="num">${simbolo}${formatEuro(importe)}</td>
            <td class="num">${escapeHtml(factura.numero_recibo || '—')}</td>
          </tr>
        </tbody>
      </table>
    </section>` : ''}

    <div class="footer">
      ${escapeHtml(BRAND_NAME)} — servicio prestado por ${escapeHtml(ISSUER.razon_social)}.
      Documento generado electrónicamente.
      <div class="footer-bar" aria-hidden="true"></div>
    </div>

    <div class="toolbar no-print">
      <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>
  </div>
</body>
</html>`;
};

module.exports = { renderFacturaHtml };
