const path = require('path');

/** Producto comercial */
const BRAND_NAME = 'Timecor';

/** Empresa desarrolladora / prestadora (sustituye «Inclusion Corporativa» en el byline) */
const BRAND_COMPANY_NAME = 'NexCor ia solutions';
const BRAND_COMPANY_URL = process.env.BRAND_COMPANY_URL || 'https://nexcor.es';

/** Texto completo: «Timecor by NexCor ia solutions» */
const BRAND_BYLINE = `${BRAND_NAME} by ${BRAND_COMPANY_NAME}`;
const LOGO_PATH = path.resolve(__dirname, '../utils/images/timecor-logo.png');

/** HTML del byline: Timecor (texto) + enlace solo a la empresa NexCor */
const buildBrandBylineHtml = ({ color = '#999', underline = true } = {}) => {
  const linkStyle = [
    `color:${color}`,
    underline ? 'text-decoration:underline' : 'text-decoration:none',
  ].join(';');

  return `${BRAND_NAME} by <a href="${BRAND_COMPANY_URL}" style="${linkStyle}">${BRAND_COMPANY_NAME}</a>`;
};

module.exports = {
  BRAND_NAME,
  BRAND_COMPANY_NAME,
  BRAND_COMPANY_URL,
  BRAND_BYLINE,
  LOGO_PATH,
  buildBrandBylineHtml,
};
