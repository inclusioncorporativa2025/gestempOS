#!/usr/bin/env node
/**
 * Prueba manual — plantilla WhatsApp alertas de fichaje (Meta Cloud).
 *
 * Uso:
 *   cd backend
 *   node scripts/test-wa-alerta-fichaje-template.js --to=633326622
 *   node scripts/test-wa-alerta-fichaje-template.js --to=633326622 --nombre=Julia --fecha=2026-09-28 --hora=09:00
 *
 * Requiere: WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 * Opcional: WHATSAPP_ALERTAS_TEMPLATE_NAME (default timecor_alerta_fichaje_entrada)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dayjs = require('dayjs');
const {
  alertasUsanPlantilla,
  sendAlertaFichajeWhatsapp,
  templateName,
  templateLang,
} = require('../services/whatsappAlertasTemplate');
const metaClient = require('../services/whatsappCloudClient');

const graphVersion = () => process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';

const preflightMeta = async () => {
  const token = process.env.WHATSAPP_CLOUD_TOKEN || '';
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  if (!token || !phoneId) {
    return { ok: false, message: 'Faltan WHATSAPP_CLOUD_TOKEN o WHATSAPP_PHONE_NUMBER_ID' };
  }

  const url = `https://graph.facebook.com/${graphVersion()}/${phoneId}?fields=display_phone_number,verified_name,quality_rating,platform_type`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = data?.error?.message || `HTTP ${response.status}`;
    const code = data?.error?.code;
    if (code === 190) {
      return {
        ok: false,
        message: 'Token caducado o inválido. Genera uno nuevo en Meta (Paso 1) o usa token permanente de usuario del sistema.',
        details: data.error,
      };
    }
    return { ok: false, message: msg, details: data.error };
  }

  return {
    ok: true,
    phoneId,
    display: data.display_phone_number,
    verifiedName: data.verified_name,
    quality: data.quality_rating,
  };
};

const args = process.argv.slice(2);
const toArg = args.find((a) => a.startsWith('--to='));
const nombreArg = args.find((a) => a.startsWith('--nombre='));
const fechaArg = args.find((a) => a.startsWith('--fecha='));
const horaArg = args.find((a) => a.startsWith('--hora='));

const to = toArg ? toArg.split('=')[1] : null;
const nombre = nombreArg ? nombreArg.split('=').slice(1).join('=') : 'Prueba';
const fechaDia = fechaArg ? fechaArg.split('=')[1] : dayjs().format('YYYY-MM-DD');
const horaEntrada = horaArg ? horaArg.split('=')[1] : '09:00';

const main = async () => {
  if (!to) {
    console.error('Indica --to=633326622 (móvil destino)');
    process.exit(1);
  }

  console.log('Meta configurado:', metaClient.isConfigured());
  console.log('Usa plantilla alertas:', alertasUsanPlantilla());
  console.log('Plantilla:', templateName(), 'idioma:', templateLang());

  if (!metaClient.isConfigured()) {
    console.error('Faltan WHATSAPP_CLOUD_TOKEN o WHATSAPP_PHONE_NUMBER_ID en .env');
    process.exit(1);
  }

  const pre = await preflightMeta();
  if (!pre.ok) {
    console.error('Preflight Meta:', pre.message);
    if (pre.details) {
      console.error(JSON.stringify(pre.details, null, 2));
    }
    process.exit(1);
  }

  console.log('Línea de envío:', pre.display, pre.verifiedName ? `(${pre.verifiedName})` : '');
  console.log('Phone number ID:', pre.phoneId);
  if (String(pre.display || '').includes('555')) {
    console.warn('AVISO: estás usando el número de TEST (+555). La plantilla timecor_alerta_fichaje_entrada está en la WABA Nexcor (+34 686). Usa PHONE_NUMBER_ID=1177302705474049 para producción.');
  }

  const result = await sendAlertaFichajeWhatsapp(to, {
    nombre,
    fechaDia,
    horaEntrada,
    tipoEnvio: 'alerta',
  });

  console.log('Enviado:', JSON.stringify(result, null, 2));
  process.exit(0);
};

main().catch((error) => {
  console.error('test-wa-alerta-fichaje-template:', error.message);
  if (error.details) {
    console.error(JSON.stringify(error.details, null, 2));
  }
  process.exit(1);
});
