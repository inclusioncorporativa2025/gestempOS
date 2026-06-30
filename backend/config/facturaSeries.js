/**
 * Series de facturación Timecor (emisor: Inclusión Corporativa).
 *
 * R — Recibo: periodo de prueba o importe 0 €
 * F — Factura: cobros con importe > 0 €
 *
 * Formato: {serie}-{ejercicio}-{secuencial 5 dígitos}  →  F-2026-00001
 * Recibo de cobro: {YY}{MM}-{secuencial 4 dígitos}      →  2606-0001
 */
const SERIE_RECIBO = 'R';
const SERIE_FACTURA = 'F';

const SERIES = {
  [SERIE_RECIBO]: {
    codigo: SERIE_RECIBO,
    etiqueta: 'Recibo',
    documentoTitulo: 'Recibo',
  },
  [SERIE_FACTURA]: {
    codigo: SERIE_FACTURA,
    etiqueta: 'Factura',
    documentoTitulo: 'Factura',
  },
};

const resolverSerie = (importeTotal) =>
  Number(importeTotal) === 0 ? SERIE_RECIBO : SERIE_FACTURA;

const obtenerDefinicionSerie = (serie) =>
  SERIES[serie] || SERIES[SERIE_FACTURA];

const formatearNumeroFactura = (serie, ejercicio, secuencial) =>
  `${serie}-${ejercicio}-${String(secuencial).padStart(5, '0')}`;

const formatearNumeroRecibo = (fecha, secuencial) => {
  const date = fecha instanceof Date ? fecha : new Date(fecha);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}-${String(secuencial).padStart(4, '0')}`;
};

module.exports = {
  SERIE_RECIBO,
  SERIE_FACTURA,
  SERIES,
  resolverSerie,
  obtenerDefinicionSerie,
  formatearNumeroFactura,
  formatearNumeroRecibo,
};
