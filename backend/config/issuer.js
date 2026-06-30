/**
 * Datos fiscales del emisor (Inclusión Corporativa).
 * El documento usa logo Timecor (brand.js).
 */
const ISSUER = {
  razon_social: 'Inclusión Corporativa S.L.',
  direccion: 'C/ Travesía de Vigo 207 B local 2',
  codigo_postal: '36207',
  ciudad: 'Vigo',
  provincia: 'Pontevedra',
  pais: 'España',
  telefono: '+34 644 00 45 19',
  email: 'info@inclusioncorporativa.es',
  cif: process.env.ISSUER_CIF || '',
  web: 'https://timecor.es',
};

const formatDireccionCompleta = () => {
  const { direccion, codigo_postal, ciudad, provincia, pais } = ISSUER;
  return [direccion, `${codigo_postal} ${ciudad} ${provincia}`, pais]
    .filter(Boolean)
    .join(', ');
};

module.exports = { ISSUER, formatDireccionCompleta };
