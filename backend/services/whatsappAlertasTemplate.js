const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);

const { APP_URL } = require('../config/appUrls');
const metaClient = require('./whatsappCloudClient');
const { sendText, useMetaProvider } = require('./whatsappMessaging');

const templateName = () => (
  String(process.env.WHATSAPP_ALERTAS_TEMPLATE_NAME || 'timecor_alerta_fichaje_entrada').trim()
);

const templateLang = () => (
  String(process.env.WHATSAPP_ALERTAS_TEMPLATE_LANG || 'es').trim()
);

/** Plantillas Meta sin variables en el body (p. ej. hello_world en Paso 1). */
const PLANTILLAS_SIN_BODY_PARAMS = new Set(['hello_world']);

const cantidadParametrosBodyPlantilla = () => {
  const envRaw = process.env.WHATSAPP_ALERTAS_TEMPLATE_BODY_PARAMS;
  if (envRaw !== undefined && String(envRaw).trim() !== '') {
    const n = Number(envRaw);
    if (Number.isFinite(n) && n >= 0) {
      return Math.floor(n);
    }
  }
  const name = templateName();
  if (PLANTILLAS_SIN_BODY_PARAMS.has(name)) {
    return 0;
  }
  return 3;
};

const alertasUsanPlantilla = () => {
  const flag = String(process.env.WHATSAPP_ALERTAS_USE_TEMPLATE ?? '1').trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'no') {
    return false;
  }
  return Boolean(templateName()) && useMetaProvider() && metaClient.isConfigured();
};

const formatFechaDiaEs = (fechaDia) => {
  const iso = dayjs(fechaDia, 'YYYY-MM-DD', true);
  if (iso.isValid()) {
    return iso.format('DD/MM/YYYY');
  }
  const parsed = dayjs(fechaDia);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : String(fechaDia || '');
};

/** Meta limita longitud de parámetros de plantilla. */
const sanitizarParametroPlantilla = (value, maxLen = 80) => (
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
);

const primerNombre = (nombreCompleto) => {
  const partes = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
  return sanitizarParametroPlantilla(partes[0] || 'Usuario', 40);
};

const buildComponentesAlertaEntrada = ({ nombre, fechaDia, horaEntrada }) => {
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: primerNombre(nombre) },
        { type: 'text', text: sanitizarParametroPlantilla(formatFechaDiaEs(fechaDia), 20) },
        { type: 'text', text: sanitizarParametroPlantilla(horaEntrada, 10) },
      ],
    },
  ];

  const buttonUrl = String(process.env.WHATSAPP_ALERTAS_TEMPLATE_BUTTON_URL || APP_URL).trim();
  if (buttonUrl && process.env.WHATSAPP_ALERTAS_TEMPLATE_BUTTON_URL_PARAM === '1') {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: sanitizarParametroPlantilla(buttonUrl, 200) }],
    });
  }

  return components;
};

const buildComponentesPlantillaAlerta = ({ nombre, fechaDia, horaEntrada }) => {
  const count = cantidadParametrosBodyPlantilla();
  if (count === 0) {
    return null;
  }
  if (count === 3) {
    return buildComponentesAlertaEntrada({ nombre, fechaDia, horaEntrada });
  }
  const params = [
    { type: 'text', text: primerNombre(nombre) },
    { type: 'text', text: sanitizarParametroPlantilla(formatFechaDiaEs(fechaDia), 20) },
    { type: 'text', text: sanitizarParametroPlantilla(horaEntrada, 10) },
  ].slice(0, count);
  return [{ type: 'body', parameters: params }];
};

const textoPlanoFallback = ({ nombre, fechaDia, horaEntrada, tipoEnvio }) => {
  const fechaLabel = formatFechaDiaEs(fechaDia);
  const horaLabel = horaEntrada;
  if (tipoEnvio === 'recordatorio') {
    return `${nombre}, recordatorio: aún no consta tu fichaje de entrada previsto a las ${horaLabel} (${fechaLabel}). Regístralo en TimeCor.`;
  }
  return `${nombre}, no consta tu fichaje de entrada previsto a las ${horaLabel} (${fechaLabel}). Regístralo en TimeCor.`;
};

/**
 * Envía alerta de fichaje por WhatsApp (plantilla Meta o texto si no aplica).
 */
const sendAlertaFichajeWhatsapp = async (toPhone, {
  nombre,
  fechaDia,
  horaEntrada,
  tipoEnvio = 'alerta',
}) => {
  if (alertasUsanPlantilla()) {
    const components = buildComponentesPlantillaAlerta({ nombre, fechaDia, horaEntrada });
    return metaClient.sendTemplate(toPhone, {
      name: templateName(),
      languageCode: templateLang(),
      components,
    });
  }

  return sendText(
    toPhone,
    textoPlanoFallback({ nombre, fechaDia, horaEntrada, tipoEnvio }),
  );
};

module.exports = {
  alertasUsanPlantilla,
  templateName,
  templateLang,
  formatFechaDiaEs,
  buildComponentesAlertaEntrada,
  buildComponentesPlantillaAlerta,
  cantidadParametrosBodyPlantilla,
  sendAlertaFichajeWhatsapp,
};
