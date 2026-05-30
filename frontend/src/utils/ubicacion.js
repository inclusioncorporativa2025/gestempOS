/**
 * Convierte el valor guardado en BD a { lat, lng }.
 *
 * Origen de los datos al fichar (Home + guardarUbicacion):
 * - navigator.geolocation → POST /ficha/create → ubicacion_entrada / ubicacion_salida
 *
 * Formatos en BD:
 * - Nuevo: "40.4168,-3.7038"
 * - Legado: "40.4168--3.7038" (lng negativa; el "--" rompía el signo al parsear mal)
 * - Legado: "40.4168-3.7038"
 */
export const parseUbicacionCoords = (ubicacionStr) => {
  if (!ubicacionStr || typeof ubicacionStr !== 'string') return null;
  const trimmed = ubicacionStr.trim();
  if (!trimmed || trimmed === '0-0') return null;

  if (trimmed.includes(',')) {
    const [latStr, lngStr] = trimmed.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      return { lat, lng };
    }
    return null;
  }

  if (trimmed.includes('--')) {
    const [latStr, lngStr] = trimmed.split('--');
    const lat = parseFloat(latStr);
    const lng = -Math.abs(parseFloat(lngStr));
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      return { lat, lng };
    }
    return null;
  }

  const sep = trimmed.lastIndexOf('-');
  if (sep <= 0) return null;
  const lat = parseFloat(trimmed.slice(0, sep));
  const lng = parseFloat(trimmed.slice(sep + 1));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
};
