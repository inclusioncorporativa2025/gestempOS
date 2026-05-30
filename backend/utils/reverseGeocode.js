const NodeCache = require('node-cache');

const addressCache = new NodeCache({ stdTTL: 86400 });

const USER_AGENT =
  process.env.GEOCODING_USER_AGENT || 'GestempOS/1.0 (soporte@fichaeneltrabajo.es)';

const formatAddress = (data) => {
  const a = data?.address;
  if (!a) return null;

  const calle = [a.road, a.pedestrian, a.footway, a.path].find(Boolean);
  const numero = a.house_number;
  const lineaCalle = [calle, numero].filter(Boolean).join(' ');

  const localidad =
    a.city || a.town || a.village || a.municipality || a.suburb || a.neighbourhood;
  const provincia = a.state || a.province;
  const codigoPostal = a.postcode;

  const partes = [lineaCalle, codigoPostal, localidad, provincia, a.country].filter(Boolean);
  return partes.length ? partes.join(', ') : null;
};

const getDireccionDesdeLatLng = async (lat, lng) => {
  const cacheKey = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  const cached = addressCache.get(cacheKey);
  if (cached) return cached;

  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'json');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'es');

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Nominatim respondió ${response.status}`);
  }

  const data = await response.json();
  const direccion =
    formatAddress(data) || data.display_name || `${lat}, ${lng}`;

  addressCache.set(cacheKey, direccion);
  return direccion;
};

module.exports = { getDireccionDesdeLatLng };
