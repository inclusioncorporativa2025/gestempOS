/**
 * Guarda coordenadas como "lat,lng" (sin ambigüedad).
 * Formato legado en BD: "lat-lng" o "lat--lng" (el doble guion aparece si lng < 0).
 */
const formatUbicacionStorage = (ubicacion) => {
  if (!ubicacion) return null;
  const lat = Number(ubicacion.latitude);
  const lng = Number(ubicacion.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return `${lat},${lng}`;
};

module.exports = { formatUbicacionStorage };
