/**
 * Normaliza un número para OpenWA (chatId = <digits>@c.us).
 * Acepta +34 612 34 56 78, 34612345678, 612345678, etc.
 */
const normalizarTelefonoWhatsapp = (input) => {
  if (!input) return null;

  let raw = String(input).trim();
  if (raw.includes('@')) {
    raw = raw.split('@')[0];
  }

  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // España: móvil sin prefijo internacional
  if (/^[6789]\d{8}$/.test(digits)) {
    digits = `34${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) {
    return null;
  }

  return digits;
};

const telefonoAChatId = (telefono) => {
  const digits = normalizarTelefonoWhatsapp(telefono);
  return digits ? `${digits}@c.us` : null;
};

const chatIdATelefono = (chatId) => {
  if (!chatId) return null;
  return normalizarTelefonoWhatsapp(chatId);
};

module.exports = {
  normalizarTelefonoWhatsapp,
  telefonoAChatId,
  chatIdATelefono,
};
