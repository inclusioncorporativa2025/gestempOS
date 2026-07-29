const { Op } = require('sequelize');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');

const { sequelize } = require('../config/db');
const Usuario = require('../models/Usuario');
const { chatIdATelefono } = require('../utils/telefonoWhatsapp');
const { crearRegistroFichaje, resolverEstadoJornada } = require('./fichajeRegistroService');
const { empresaTieneFeature } = require('./planService');
const { sendText } = require('./openwaClient');
const { TZ } = require('../utils/registroHash');

dayjs.extend(utc);
dayjs.extend(timezone);

const ACCION_LABELS = {
  1: 'Entrada',
  2: 'Salida',
  3: 'Inicio de pausa',
  4: 'Fin de pausa',
};

const formatearHora = () => dayjs().tz(TZ).format('HH:mm');

const marcarEventoWebhook = async (idempotencyKey, estado, { eventType, sessionId, chatId, errorMensaje } = {}) => {
  await sequelize.query(
    `INSERT INTO openwa_webhook_events (
       idempotency_key, event_type, session_id, chat_id, estado, error_mensaje, procesado_en
     ) VALUES (
       :key, :eventType, :sessionId, :chatId, :estado, :errorMensaje, :procesadoEn
     )
     ON DUPLICATE KEY UPDATE
       estado = VALUES(estado),
       error_mensaje = VALUES(error_mensaje),
       procesado_en = VALUES(procesado_en)`,
    {
      replacements: {
        key: idempotencyKey,
        eventType: eventType || 'unknown',
        sessionId: sessionId || null,
        chatId: chatId || null,
        estado,
        errorMensaje: errorMensaje || null,
        procesadoEn: estado === 'processed' ? new Date() : null,
      },
    },
  );
};

const eventoYaProcesado = async (idempotencyKey) => {
  const rows = await sequelize.query(
    `SELECT estado FROM openwa_webhook_events WHERE idempotency_key = :key LIMIT 1`,
    {
      replacements: { key: idempotencyKey },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return rows[0]?.estado === 'processed';
};

const buscarUsuarioPorChatId = async (chatId) => {
  const telefono = chatIdATelefono(chatId);
  if (!telefono) return null;

  return Usuario.findOne({
    where: {
      telefono_whatsapp: telefono,
      fecha_baja: null,
    },
  });
};

const listarEmpresasWhatsappUsuario = async (idUsuario) => {
  const rows = await sequelize.query(
    `SELECT e.id_empresa, e.nombre, e.plan, e.id_plan
     FROM m_usuarios_empresas ue
     INNER JOIN m_empresas e ON e.id_empresa = ue.id_empresa
     WHERE ue.id_usuario = :idUsuario
       AND ue.fecha_baja IS NULL
       AND ue.activo = 1
       AND e.fecha_baja IS NULL
       AND e.activo = 1`,
    {
      replacements: { idUsuario },
      type: sequelize.QueryTypes.SELECT,
    },
  );

  const empresas = [];
  for (const row of rows) {
    const tieneFeature = await empresaTieneFeature(row.id_empresa, 'whatsapp_fichaje');
    if (tieneFeature) {
      empresas.push({
        id_empresa: row.id_empresa,
        nombre: row.nombre || `Empresa ${row.id_empresa}`,
      });
    }
  }
  return empresas;
};

const getContextoChat = async (chatId) => {
  const rows = await sequelize.query(
    `SELECT chat_id, id_usuario, id_empresa, paso
     FROM whatsapp_chat_contexto WHERE chat_id = :chatId LIMIT 1`,
    {
      replacements: { chatId },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return rows[0] || null;
};

const guardarContextoChat = async ({ chatId, idUsuario, idEmpresa = null, paso = 'menu' }) => {
  await sequelize.query(
    `INSERT INTO whatsapp_chat_contexto (chat_id, id_usuario, id_empresa, paso)
     VALUES (:chatId, :idUsuario, :idEmpresa, :paso)
     ON DUPLICATE KEY UPDATE
       id_usuario = VALUES(id_usuario),
       id_empresa = VALUES(id_empresa),
       paso = VALUES(paso),
       actualizado_en = CURRENT_TIMESTAMP`,
    {
      replacements: { chatId, idUsuario, idEmpresa, paso },
    },
  );
};

const construirMenu = async (idUsuario, idEmpresa, nombreUsuario) => {
  const { estado, acciones } = await resolverEstadoJornada(idUsuario, idEmpresa);
  const hora = formatearHora();

  const lineasAcciones = acciones.map((id, index) => {
    const num = index + 1;
    return `${num}️⃣ ${ACCION_LABELS[id]}`;
  });

  const estadoLabel = {
    out: 'Fuera de jornada',
    in: 'En jornada',
    break: 'En pausa',
  }[estado];

  return (
    `*Timecor* · ${hora}\n` +
    `Hola ${nombreUsuario} 👋\n` +
    `Estado: *${estadoLabel}*\n\n` +
    `${lineasAcciones.join('\n')}\n\n` +
    `Responde con el número o escribe: entrada, salida, pausa, fin.\n` +
    `Escribe *menu* para ver las opciones o *empresa* para cambiar de empresa.`
  );
};

const construirMenuEmpresas = (empresas) => {
  const lineas = empresas.map((e, index) => `${index + 1}️⃣ ${e.nombre}`);
  return (
    `Tienes varias empresas con fichaje WhatsApp activo.\n\n` +
    `${lineas.join('\n')}\n\n` +
    `Responde con el número de la empresa.`
  );
};

const parsearAccion = (texto, accionesPermitidas) => {
  const t = String(texto || '').trim().toLowerCase();
  if (!t) return null;

  const porNumero = Number(t);
  if (Number.isInteger(porNumero) && porNumero >= 1 && porNumero <= accionesPermitidas.length) {
    return accionesPermitidas[porNumero - 1];
  }

  const mapa = {
    entrada: 1,
    entro: 1,
    inicio: 1,
    salida: 2,
    salgo: 2,
    fin: 4,
    'fin pausa': 4,
    'fin descanso': 4,
    pausa: 3,
    descanso: 3,
  };

  const tipo = mapa[t];
  if (tipo && accionesPermitidas.includes(tipo)) {
    return tipo;
  }

  return null;
};

const resolverEmpresaActiva = async ({ chatId, idUsuario, empresas, texto }) => {
  const contexto = await getContextoChat(chatId);

  if (contexto?.id_empresa && empresas.some((e) => e.id_empresa === contexto.id_empresa)) {
    return { idEmpresa: contexto.id_empresa, paso: 'menu' };
  }

  if (empresas.length === 1) {
    await guardarContextoChat({ chatId, idUsuario, idEmpresa: empresas[0].id_empresa, paso: 'menu' });
    return { idEmpresa: empresas[0].id_empresa, paso: 'menu' };
  }

  const t = String(texto || '').trim().toLowerCase();
  const seleccion = Number(t);
  if (Number.isInteger(seleccion) && seleccion >= 1 && seleccion <= empresas.length) {
    const elegida = empresas[seleccion - 1];
    await guardarContextoChat({ chatId, idUsuario, idEmpresa: elegida.id_empresa, paso: 'menu' });
    return { idEmpresa: elegida.id_empresa, paso: 'menu', recienElegida: true };
  }

  await guardarContextoChat({ chatId, idUsuario, idEmpresa: null, paso: 'elegir_empresa' });
  return { paso: 'elegir_empresa' };
};

const procesarMensajeEntrante = async ({ chatId, body, fromMe }) => {
  if (fromMe) {
    return { ignored: true, reason: 'outgoing' };
  }

  const texto = String(body || '').trim();
  const t = texto.toLowerCase();

  const usuario = await buscarUsuarioPorChatId(chatId);
  if (!usuario) {
    return {
      reply:
        'No encontramos tu número en Timecor.\n\n' +
        'Pide a tu administrador que vincule tu WhatsApp en la ficha de personal, ' +
        'o configúralo en *Mi perfil* si tu empresa tiene el plan Completo.',
    };
  }

  const empresas = await listarEmpresasWhatsappUsuario(usuario.id_usuario);
  if (!empresas.length) {
    return {
      reply:
        'Tu empresa no tiene activo el fichaje por WhatsApp (plan Completo).\n' +
        'Contacta con tu administrador.',
    };
  }

  if (t === 'empresa' || t === 'cambiar empresa') {
    await guardarContextoChat({
      chatId,
      idUsuario: usuario.id_usuario,
      idEmpresa: null,
      paso: 'elegir_empresa',
    });
    return { reply: construirMenuEmpresas(empresas) };
  }

  const empresaCtx = await resolverEmpresaActiva({
    chatId,
    idUsuario: usuario.id_usuario,
    empresas,
    texto,
  });

  if (empresaCtx.paso === 'elegir_empresa') {
    return { reply: construirMenuEmpresas(empresas) };
  }

  const idEmpresa = empresaCtx.idEmpresa;
  const { acciones } = await resolverEstadoJornada(usuario.id_usuario, idEmpresa);

  if (!texto || t === 'menu' || t === 'ayuda' || t === 'hola') {
    return { reply: await construirMenu(usuario.id_usuario, idEmpresa, usuario.nombre) };
  }

  const tipoRegistro = parsearAccion(texto, acciones);
  if (!tipoRegistro) {
    return {
      reply:
        `No entendí "${texto}".\n\n` +
        (await construirMenu(usuario.id_usuario, idEmpresa, usuario.nombre)),
    };
  }

  try {
    await crearRegistroFichaje({
      idUsuario: usuario.id_usuario,
      idEmpresa,
      tipoRegistro,
      usuarioAccion: usuario.id_usuario,
    });

    const confirmacion = `✅ *${ACCION_LABELS[tipoRegistro]}* registrada a las ${formatearHora()}.`;
    const menu = await construirMenu(usuario.id_usuario, idEmpresa, usuario.nombre);
    return { reply: `${confirmacion}\n\n${menu}`, fichaje: { tipoRegistro, idEmpresa } };
  } catch (error) {
    return {
      reply:
        `⚠️ ${error.message || 'No se pudo registrar el fichaje'}.\n\n` +
        (await construirMenu(usuario.id_usuario, idEmpresa, usuario.nombre)),
    };
  }
};

const procesarEventoOpenWA = async (event, idempotencyKey) => {
  if (!idempotencyKey) {
    return { ignored: true, reason: 'no_idempotency_key' };
  }

  if (await eventoYaProcesado(idempotencyKey)) {
    return { ignored: true, reason: 'duplicate' };
  }

  await marcarEventoWebhook(idempotencyKey, 'received', {
    eventType: event?.event || event?.type,
    sessionId: event?.sessionId,
    chatId: event?.data?.chatId || event?.data?.from,
  });

  const eventName = event?.event || event?.type;
  if (eventName !== 'message.received') {
    await marcarEventoWebhook(idempotencyKey, 'ignored', {
      eventType: eventName,
      sessionId: event?.sessionId,
    });
    return { ignored: true, reason: 'event_type' };
  }

  const data = event?.data || event?.payload?.data || {};
  const chatId = data.chatId || data.from;
  if (!chatId || String(chatId).includes('@g.us')) {
    await marcarEventoWebhook(idempotencyKey, 'ignored', { eventType: eventName, chatId });
    return { ignored: true, reason: 'group_or_missing_chat' };
  }

  try {
    const resultado = await procesarMensajeEntrante({
      chatId,
      body: data.body,
      fromMe: Boolean(data.fromMe),
    });

    if (resultado.reply) {
      await sendText(chatId, resultado.reply);
    }

    await marcarEventoWebhook(idempotencyKey, 'processed', {
      eventType: eventName,
      sessionId: event?.sessionId,
      chatId,
    });

    return resultado;
  } catch (error) {
    await marcarEventoWebhook(idempotencyKey, 'error', {
      eventType: eventName,
      sessionId: event?.sessionId,
      chatId,
      errorMensaje: error.message,
    });
    throw error;
  }
};

module.exports = {
  marcarEventoWebhook,
  eventoYaProcesado,
  procesarEventoOpenWA,
  procesarMensajeEntrante,
  buscarUsuarioPorChatId,
  listarEmpresasWhatsappUsuario,
  construirMenu,
};
