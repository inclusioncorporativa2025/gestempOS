/**
 * Iniciales para el avatar de empresa (máx. 2 letras).
 */
export const getInicialesEmpresa = (nombre) => {
  const texto = String(nombre ?? '').trim();
  if (!texto) return '?';

  const palabras = texto.split(/\s+/).filter(Boolean);
  if (palabras.length >= 2) {
    return `${palabras[0][0]}${palabras[1][0]}`.toUpperCase();
  }

  return texto.slice(0, 2).toUpperCase();
};
