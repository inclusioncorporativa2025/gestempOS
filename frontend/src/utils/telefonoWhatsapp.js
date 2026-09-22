/** Alineado con backend/utils/telefonoWhatsapp.js */
export const normalizarTelefonoWhatsApp = (raw) => {
  if (raw == null) return '';
  let rawStr = String(raw).trim();
  if (rawStr.includes('@')) {
    rawStr = rawStr.split('@')[0];
  }

  let digits = rawStr.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (/^[6789]\d{8}$/.test(digits)) {
    digits = `34${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) {
    return '';
  }

  return digits;
};

export const telefonoWhatsappValido = (raw) => Boolean(normalizarTelefonoWhatsApp(raw));

/** Muestra +34 612 34 56 78 a partir de 34612345678 */
export const formatearTelefonoWhatsappDisplay = (stored) => {
  const digits = normalizarTelefonoWhatsApp(stored);
  if (!digits) return '';

  if (digits.startsWith('34') && digits.length === 11) {
    const nacional = digits.slice(2);
    return `+34 ${nacional.slice(0, 3)} ${nacional.slice(3, 5)} ${nacional.slice(5, 7)} ${nacional.slice(7)}`;
  }

  return `+${digits}`;
};
