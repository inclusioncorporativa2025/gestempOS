import { BRAND_NAME } from '../constants/brand';

/** Normaliza teléfono a formato internacional para wa.me (España por defecto). */
export const normalizarTelefonoWhatsApp = (raw) => {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9 && /^[6789]/.test(digits)) {
    digits = `34${digits}`;
  }
  return digits;
};

export const telefonoValidoWhatsApp = (raw) => {
  const digits = normalizarTelefonoWhatsApp(raw);
  return digits.length >= 10 && digits.length <= 15;
};

export const buildWhatsAppInvitacionUrl = ({
  telefono,
  registerUrl,
  fechaExpiracionLabel,
  comercialNombre,
  enlacePagoUrl,
  codigoPago,
}) => {
  const phone = normalizarTelefonoWhatsApp(telefono);
  if (!phone) return null;

  const nombre = comercialNombre || BRAND_NAME;
  const lineas = [
    `Hola, te envío tu invitación para registrarte en ${BRAND_NAME}:`,
    '',
    `👉 Completar registro: ${registerUrl}`,
  ];

  if (enlacePagoUrl) {
    lineas.push('', `💳 Enlace de pago: ${enlacePagoUrl}`);
    if (codigoPago) {
      lineas.push(`Código de pago: ${codigoPago}`);
    }
  }

  lineas.push(
    '',
    `Válido hasta el ${fechaExpiracionLabel}.`,
    '',
    'Cualquier duda, responde a este mensaje.',
    `— ${nombre} (${BRAND_NAME})`,
  );

  return `https://wa.me/${phone}?text=${encodeURIComponent(lineas.join('\n'))}`;
};
