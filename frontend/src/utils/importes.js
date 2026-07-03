export const parserImporteEs = (value) => {
  if (value == null || value === '') return null;
  const normalized = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');
  if (!normalized) return null;
  const sinMiles = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const n = Number(sinMiles);
  return Number.isFinite(n) ? n : null;
};

export const formatterImporteEs = (value) => {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const [entero, dec = ''] = n.toFixed(2).split('.');
  const enteroFmt = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${enteroFmt},${dec}`;
};

export const propsInputImporteEs = {
  decimalSeparator: ',',
  min: 0,
  step: 0.01,
  precision: 2,
  parser: parserImporteEs,
  formatter: formatterImporteEs,
};
