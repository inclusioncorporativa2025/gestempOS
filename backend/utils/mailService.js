const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');

const { APP_URL } = require('../config/appUrls');
const { BRAND_NAME, BRAND_BYLINE, LOGO_PATH } = require('../config/brand');
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 60;
const WELCOME_TOKEN_TTL_DAYS = Number(process.env.WELCOME_TOKEN_TTL_DAYS) || 7;
const WELCOME_TOKEN_TTL_MINUTES = WELCOME_TOKEN_TTL_DAYS * 24 * 60;

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

const formatTtlTexto = (ttlMinutos) => {
  if (ttlMinutos >= 24 * 60) {
    const dias = Math.round(ttlMinutos / (24 * 60));
    return `${dias} día${dias === 1 ? '' : 's'}`;
  }
  return `${ttlMinutos} minutos`;
};

const buildTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const error = new Error('Configuración SMTP incompleta en el servidor');
    error.code = 'SMTP_NO_CONFIGURADO';
    throw error;
  }

  const smtpPort = Number.parseInt(process.env.SMTP_PORT, 10) || 587;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const logoAttachment = () => {
  if (!fs.existsSync(LOGO_PATH)) {
    return [];
  }

  return [
    {
      filename: 'logo.png',
      path: LOGO_PATH,
      cid: 'logo',
    },
  ];
};

const emailLayout = (cuerpoHtml) => `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0; padding:0; background-color:#f4f5f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <tr>
              <td style="background-color:#ffffff; padding:28px 0; text-align:center;">
                <img src="cid:logo" alt="${BRAND_NAME}" width="200" style="display:inline-block; max-width:200px; height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="height:4px; background:linear-gradient(90deg,#2BA9E0 0%,#E0529C 100%); background-color:#2BA9E0; font-size:0; line-height:0;">&nbsp;</td>
            </tr>
            ${cuerpoHtml}
            <tr>
              <td style="padding:24px 40px; background-color:#f9fafb; border-top:1px solid #eee; font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0; font-size:12px; color:#999;">© ${new Date().getFullYear()} ${BRAND_BYLINE}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
`;

const bloqueBotonEnlace = (enlace, textoBoton) => `
  <tr>
    <td style="padding:0 40px 32px 40px; text-align:center; font-family:Arial,Helvetica,sans-serif;">
      <a href="${enlace}" style="display:inline-block; background:linear-gradient(90deg,#2BA9E0 0%,#E0529C 100%); background-color:#2BA9E0; color:#ffffff; font-size:16px; font-weight:bold; text-decoration:none; padding:14px 36px; border-radius:8px;">
        ${textoBoton}
      </a>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px 32px 40px; font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 8px 0; font-size:13px; color:#777;">Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
      <p style="margin:0; font-size:13px; word-break:break-all;">
        <a href="${enlace}" style="color:#2BA9E0;">${enlace}</a>
      </p>
    </td>
  </tr>
`;

/**
 * Asigna token de contraseña al usuario y devuelve { enlace, rawToken }.
 */
const asignarTokenContrasena = async (usuario, ttlMinutos) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  usuario.reset_token_hash = hashToken(rawToken);
  usuario.reset_token_expira = new Date(Date.now() + ttlMinutos * 60 * 1000);
  await usuario.save();

  const enlace = `${APP_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(usuario.email)}`;
  return { enlace, rawToken };
};

const buildResetEmailHtml = ({ nombre, enlace, ttlTexto }) =>
  emailLayout(`
    <tr>
      <td style="padding:36px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif;">
        <h1 style="margin:0 0 16px 0; font-size:22px; color:#0f1020;">Restablecer contraseña</h1>
        <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">Hola <strong>${nombre}</strong>,</p>
        <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">
          Hemos recibido una solicitud para establecer la contraseña de tu cuenta en <strong>${BRAND_NAME}</strong>.
        </p>
        <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#444;">
          Pulsa el botón para continuar. Por seguridad, el enlace caduca en <strong>${ttlTexto}</strong>.
        </p>
      </td>
    </tr>
    ${bloqueBotonEnlace(enlace, 'Establecer contraseña')}
    <tr>
      <td style="padding:0 40px 24px 40px; font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0; font-size:13px; color:#777;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
      </td>
    </tr>
  `);

const buildInvitacionEmpleadoHtml = ({
  nombre,
  nombreEmpresa,
  emailLogin,
  enlace,
  ttlTexto,
  urlApp,
}) =>
  emailLayout(`
    <tr>
      <td style="padding:36px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif;">
        <h1 style="margin:0 0 16px 0; font-size:22px; color:#0f1020;">Invitación a ${BRAND_NAME}</h1>
        <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">Hola <strong>${nombre}</strong>,</p>
        <p style="margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#444;">
          Has sido invitado a unirte a <strong>${nombreEmpresa}</strong> en la plataforma <strong>${BRAND_NAME}</strong>.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0; background:#f9fafb; border-radius:8px; font-family:Arial,Helvetica,sans-serif;">
          <tr>
            <td style="padding:16px 20px; font-size:14px; color:#444;">
              <p style="margin:0 0 8px 0;"><strong>Empresa:</strong> ${nombreEmpresa}</p>
              <p style="margin:0 0 8px 0;"><strong>Usuario de acceso:</strong> ${emailLogin}</p>
              <p style="margin:0;"><strong>URL de la aplicación:</strong> <a href="${urlApp}" style="color:#2BA9E0;">${urlApp}</a></p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#444;">
          Pulsa el botón para crear tu contraseña y activar tu cuenta. El enlace es válido durante <strong>${ttlTexto}</strong>.
        </p>
      </td>
    </tr>
    ${bloqueBotonEnlace(enlace, 'Crear mi contraseña')}
    <tr>
      <td style="padding:0 40px 24px 40px; font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0; font-size:13px; color:#777;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
      </td>
    </tr>
  `);

const buildWelcomeEmailHtml = ({
  nombre,
  nombreEmpresa,
  licencias,
  alias,
  identificadorFiscal,
  emailLogin,
  enlace,
  enlacePago,
  ttlTexto,
  urlApp,
}) =>
  emailLayout(`
    <tr>
      <td style="padding:36px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif;">
        <h1 style="margin:0 0 16px 0; font-size:22px; color:#0f1020;">Bienvenido a ${BRAND_NAME}</h1>
        <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">Hola <strong>${nombre}</strong>,</p>
        <p style="margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#444;">
          Tu empresa ha sido dada de alta en la plataforma. Estos son los datos de tu contratación:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0; background:#f9fafb; border-radius:8px; font-family:Arial,Helvetica,sans-serif;">
          <tr>
            <td style="padding:16px 20px; font-size:14px; color:#444;">
              <p style="margin:0 0 8px 0;"><strong>Empresa:</strong> ${nombreEmpresa}</p>
              ${alias ? `<p style="margin:0 0 8px 0;"><strong>Alias:</strong> ${alias}</p>` : ''}
              ${identificadorFiscal ? `<p style="margin:0 0 8px 0;"><strong>CIF/NIF:</strong> ${identificadorFiscal}</p>` : ''}
              <p style="margin:0 0 8px 0;"><strong>Licencias contratadas:</strong> ${licencias}</p>
              <p style="margin:0 0 8px 0;"><strong>Usuario de acceso:</strong> ${emailLogin}</p>
              <p style="margin:0;"><strong>URL de la aplicación:</strong> <a href="${urlApp}" style="color:#2BA9E0;">${urlApp}</a></p>
            </td>
          </tr>
        </table>
        ${
          enlacePago
            ? `<p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#444;">
          <strong>Prueba gratuita de 15 días:</strong> añade tu tarjeta para activarla. No se realizará ningún cargo hasta que finalice la prueba y puedes cancelar en cualquier momento antes, sin compromiso.
        </p>`
            : ''
        }
        <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#444;">
          Para empezar, crea tu contraseña con el botón siguiente. El enlace es válido durante <strong>${ttlTexto}</strong>.
        </p>
      </td>
    </tr>
    ${enlacePago ? bloqueBotonEnlace(enlacePago, 'Activar 15 días gratis') : ''}
    ${bloqueBotonEnlace(enlace, 'Crear mi contraseña')}
  `);

const enviarCorreo = async ({ to, subject, html, replyTo }) => {
  const transporter = buildTransporter();
  const attachments = logoAttachment();
  const htmlConLogo = attachments.length
    ? html
    : html.replace(/<img src="cid:logo"[^>]*>/g, '');

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html: htmlConLogo,
    replyTo,
    attachments,
  });
};

/**
 * Email de restablecimiento (olvido de contraseña / login sin clave).
 */
const generarYEnviarReset = async (usuario, ttlMinutos = RESET_TOKEN_TTL_MINUTES) => {
  const ttlTexto = formatTtlTexto(ttlMinutos);
  const { enlace } = await asignarTokenContrasena(usuario, ttlMinutos);

  try {
    await enviarCorreo({
      to: usuario.email,
      subject: `${BRAND_NAME} - Restablece tu contraseña`,
      html: buildResetEmailHtml({
        nombre: usuario.nombre,
        enlace,
        ttlTexto,
      }),
    });
  } catch (mailError) {
    console.error('Error enviando email de reset:', mailError.message);
    const error = new Error(mailError.message || 'No se pudo enviar el correo');
    error.code = mailError.code === 'SMTP_NO_CONFIGURADO'
      ? 'SMTP_NO_CONFIGURADO'
      : 'EMAIL_SEND_FAILED';
    error.enlace = enlace;
    throw error;
  }

  return enlace;
};

/**
 * Email de bienvenida al alta de empresa (admin tipo 3). Token válido 1 semana por defecto.
 */
const enviarBienvenidaEmpresa = async (usuario, datosEmpresa) => {
  const ttlMinutos = WELCOME_TOKEN_TTL_MINUTES;
  const ttlTexto = formatTtlTexto(ttlMinutos);
  const { enlace } = await asignarTokenContrasena(usuario, ttlMinutos);

  const {
    nombreEmpresa,
    licencias,
    alias,
    identificadorFiscal,
    enlacePago,
  } = datosEmpresa;

  try {
    await enviarCorreo({
      to: usuario.email,
      subject: `${BRAND_NAME} - Bienvenida y acceso a tu empresa`,
      html: buildWelcomeEmailHtml({
        nombre: usuario.nombre,
        nombreEmpresa,
        licencias,
        alias: alias || '',
        identificadorFiscal: identificadorFiscal || '',
        emailLogin: usuario.email,
        enlace,
        enlacePago: enlacePago || '',
        ttlTexto,
        urlApp: APP_URL,
      }),
    });
  } catch (mailError) {
    console.error('Error enviando email de bienvenida:', mailError.message);
    throw mailError;
  }

  return enlace;
};

/**
 * Invitación a empleado/supervisor/inspector recién dado de alta.
 * Token de contraseña con la misma validez que bienvenida empresa (7 días por defecto).
 */
const enviarInvitacionEmpleado = async (usuario, { nombreEmpresa }) => {
  const ttlMinutos = WELCOME_TOKEN_TTL_MINUTES;
  const ttlTexto = formatTtlTexto(ttlMinutos);
  const { enlace } = await asignarTokenContrasena(usuario, ttlMinutos);

  try {
    await enviarCorreo({
      to: usuario.email,
      subject: `${BRAND_NAME} - Invitación para crear tu contraseña`,
      html: buildInvitacionEmpleadoHtml({
        nombre: usuario.nombre,
        nombreEmpresa: nombreEmpresa || 'tu empresa',
        emailLogin: usuario.email,
        enlace,
        ttlTexto,
        urlApp: APP_URL,
      }),
    });
  } catch (mailError) {
    console.error('Error enviando email de invitación:', mailError.message);
    throw mailError;
  }

  return enlace;
};

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'soporte@timecor.es';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const isEmailValido = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const enviarNotificacionGestion = async ({
  destinatarios,
  tipo,
  nombreSolicitante,
  mesCierre,
  detalleAusencia,
}) => {
  const validos = [...new Set((destinatarios || []).map((e) => String(e).trim()).filter(isEmailValido))];
  if (!validos.length) {
    console.warn(`[mail] enviarNotificacionGestion(${tipo}): sin destinatarios válidos`);
    return { enviado: false, destinatarios: [] };
  }

  let subject = '';
  let cuerpo = '';

  if (tipo === 'modificacion_horario') {
    subject = 'Solicitud de modificación de horario';
    cuerpo = `
      <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#333;">
        La persona trabajadora <strong>${escapeHtml(nombreSolicitante || 'Un miembro del personal')}</strong>
        ha solicitado un cambio de horario.
      </p>
      <p style="margin:0; font-size:15px; line-height:1.6; color:#333;">
        Por favor, revísela desde la aplicación, en la pestaña <strong>Notificaciones</strong>,
        y gestione su aprobación o denegación.
      </p>`;
  } else if (tipo === 'cierre_jornada') {
    const mesFormateado = mesCierre
      ? String(mesCierre).replace(/^(\d{4})-(\d{2})$/, '$2/$1')
      : '';
    subject = 'Solicitud cierre jornada mensual';
    cuerpo = `
      <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#333;">
        La persona trabajadora <strong>${escapeHtml(nombreSolicitante || 'Un miembro del personal')}</strong>
        ha creado una petición de cierre de jornada mensual correspondiente al periodo
        <strong>${escapeHtml(mesFormateado)}</strong>.
      </p>
      <p style="margin:0; font-size:15px; line-height:1.6; color:#333;">
        Por favor, revísela desde la aplicación, en la pestaña <strong>Notificaciones</strong>,
        y gestione su aprobación o denegación.
      </p>`;
  } else if (tipo === 'solicitud_ausencia') {
    subject = 'Solicitud de ausencia pendiente de aprobación';
    cuerpo = `
      <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#333;">
        La persona trabajadora <strong>${escapeHtml(nombreSolicitante || 'Un miembro del personal')}</strong>
        ha solicitado una ausencia
        ${detalleAusencia ? `(<strong>${escapeHtml(detalleAusencia)}</strong>)` : ''}.
      </p>
      <p style="margin:0; font-size:15px; line-height:1.6; color:#333;">
        Por favor, revísela desde la aplicación, en la pestaña <strong>Notificaciones</strong>,
        y gestione su aprobación o denegación.
      </p>`;
  } else {
    throw new Error(`Tipo de notificación desconocido: ${tipo}`);
  }

  await enviarCorreo({
    to: validos.join(', '),
    subject,
    html: emailLayout(cuerpo),
  });

  console.log(`[mail] Notificación ${tipo} enviada a ${validos.length} destinatario(s)`);
  return { enviado: true, destinatarios: validos };
};

const buildSupportSubject = ({ nombreEmpresa, idEmpresa }) => {
  const empresa = nombreEmpresa || 'Sin empresa';
  const id = idEmpresa != null ? idEmpresa : 'N/A';
  return `[Soporte] ${empresa} (ID: ${id})`;
};

const buildSupportEmailHtml = ({
  nombreUsuario,
  emailUsuario,
  nombreEmpresa,
  idEmpresa,
  idUsuario,
  mensaje,
}) =>
  emailLayout(`
    <tr>
      <td style="padding:32px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif;">
        <h2 style="margin:0 0 16px 0; font-size:20px; color:#001529;">Nueva consulta de soporte</h2>
        <p style="margin:0; font-size:14px; color:#444;">
          Mensaje enviado desde la plataforma ${BRAND_NAME}.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 16px 40px; font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px; color:#333;">
          <tr><td style="padding:6px 0;"><strong>Usuario:</strong> ${escapeHtml(nombreUsuario)}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Email de contacto:</strong> ${escapeHtml(emailUsuario)}</td></tr>
          <tr><td style="padding:6px 0;"><strong>Empresa:</strong> ${escapeHtml(nombreEmpresa)}</td></tr>
          <tr><td style="padding:6px 0;"><strong>ID empresa:</strong> ${escapeHtml(idEmpresa)}</td></tr>
          <tr><td style="padding:6px 0;"><strong>ID usuario:</strong> ${escapeHtml(idUsuario)}</td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 32px 40px; font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0 0 8px 0; font-size:14px; font-weight:bold; color:#001529;">Mensaje</p>
        <div style="padding:16px; background:#f7f9fb; border-radius:8px; border:1px solid #e8ecf0; font-size:14px; line-height:1.6; color:#333; white-space:pre-wrap;">${escapeHtml(mensaje)}</div>
      </td>
    </tr>
  `);

const enviarCorreoSoporte = async ({
  nombreUsuario,
  emailUsuario,
  nombreEmpresa,
  idEmpresa,
  idUsuario,
  mensaje,
}) => {
  await enviarCorreo({
    to: SUPPORT_EMAIL,
    replyTo: emailUsuario,
    subject: buildSupportSubject({ nombreEmpresa, idEmpresa }),
    html: buildSupportEmailHtml({
      nombreUsuario,
      emailUsuario,
      nombreEmpresa,
      idEmpresa,
      idUsuario,
      mensaje,
    }),
  });
};

const botonPlanEnlace = (href, texto, primario = false) => {
  if (!href) {
    return `<span style="display:inline-block; padding:8px 14px; font-size:13px; color:#999; border:1px solid #ddd; border-radius:6px;">${texto}</span>`;
  }
  const bg = primario
    ? 'background:linear-gradient(90deg,#2BA9E0 0%,#E0529C 100%); background-color:#2BA9E0; color:#ffffff;'
    : 'background:#ffffff; color:#2BA9E0; border:1px solid #2BA9E0;';
  return `<a href="${href}" style="display:inline-block; ${bg} font-size:13px; font-weight:bold; text-decoration:none; padding:8px 14px; border-radius:6px; margin:2px 4px;">${texto}</a>`;
};

const buildRenewalEmailHtml = ({
  nombre,
  nombreEmpresa,
  licencias,
  periodEndLabel,
  enlaceRenovacion,
  enlacesPlanes,
  descuentoAnual,
}) => {
  const filasPlanes = (enlacesPlanes || []).map((plan) => {
    const disabled = !plan.available;
    return `
      <tr>
        <td style="padding:14px 12px; border-bottom:1px solid #eee; font-family:Arial,Helvetica,sans-serif; vertical-align:top;">
          <strong style="font-size:15px; color:#0f1020;">${escapeHtml(plan.name)}</strong>
          ${disabled ? '<br /><span style="font-size:12px; color:#999;">Próximamente</span>' : ''}
          <br /><span style="font-size:13px; color:#666;">Mín. ${plan.minLicencias} licencias</span>
        </td>
        <td style="padding:14px 12px; border-bottom:1px solid #eee; font-size:13px; color:#444; white-space:nowrap;">
          ${plan.priceMonthly} € / mes
        </td>
        <td style="padding:14px 12px; border-bottom:1px solid #eee; font-size:13px; color:#444; white-space:nowrap;">
          ${plan.priceAnnual} € / año
        </td>
        <td style="padding:14px 8px; border-bottom:1px solid #eee; text-align:right;">
          ${disabled ? '—' : botonPlanEnlace(plan.mensual, 'Mensual')}
          ${disabled ? '' : botonPlanEnlace(plan.anual, 'Anual', true)}
        </td>
      </tr>
    `;
  }).join('');

  return emailLayout(`
    <tr>
      <td style="padding:36px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif;">
        <h1 style="margin:0 0 16px 0; font-size:22px; color:#0f1020;">Renueva tu suscripción</h1>
        <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">Hola <strong>${escapeHtml(nombre)}</strong>,</p>
        <p style="margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#444;">
          El periodo de facturación manual de <strong>${escapeHtml(nombreEmpresa)}</strong>
          finaliza el <strong>${escapeHtml(periodEndLabel)}</strong> (en 7 días).
          Para seguir usando ${BRAND_NAME} sin interrupciones, activa el pago automático con tarjeta.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0; background:#f9fafb; border-radius:8px;">
          <tr>
            <td style="padding:16px 20px; font-size:14px; color:#444; font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 8px 0;"><strong>Licencias actuales:</strong> ${escapeHtml(licencias)}</p>
              <p style="margin:0;"><strong>Fin del periodo:</strong> ${escapeHtml(periodEndLabel)}</p>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">
          Elige plan y ciclo de pago. En el <strong>plan anual ${escapeHtml(descuentoAnual)}</strong>.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 8px 24px; font-family:Arial,Helvetica,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; font-size:14px;">
          <tr style="background:#f3f4f6;">
            <th align="left" style="padding:10px 12px; font-size:12px; color:#666;">Plan</th>
            <th align="left" style="padding:10px 12px; font-size:12px; color:#666;">Mensual</th>
            <th align="left" style="padding:10px 12px; font-size:12px; color:#666;">Anual</th>
            <th align="right" style="padding:10px 8px; font-size:12px; color:#666;">Pagar</th>
          </tr>
          ${filasPlanes}
        </table>
      </td>
    </tr>
    ${bloqueBotonEnlace(enlaceRenovacion, 'Ver planes y elegir ciclo')}
    <tr>
      <td style="padding:0 40px 24px 40px; font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0; font-size:13px; color:#777;">
          Si ya has renovado, puedes ignorar este correo. Para ampliar licencias antes de la renovación,
          contacta con soporte.
        </p>
      </td>
    </tr>
  `);
};

const enviarAvisoRenovacionLegacy = async ({
  nombre,
  email,
  nombreEmpresa,
  licencias,
  periodEndLabel,
  enlaceRenovacion,
  enlacesPlanes,
  descuentoAnual,
}) => {
  await enviarCorreo({
    to: email,
    subject: `${BRAND_NAME} - Renueva tu suscripción (7 días restantes)`,
    html: buildRenewalEmailHtml({
      nombre,
      nombreEmpresa,
      licencias,
      periodEndLabel,
      enlaceRenovacion,
      enlacesPlanes,
      descuentoAnual,
    }),
  });
};

module.exports = {
  hashToken,
  RESET_TOKEN_TTL_MINUTES,
  WELCOME_TOKEN_TTL_MINUTES,
  WELCOME_TOKEN_TTL_DAYS,
  generarYEnviarReset,
  enviarBienvenidaEmpresa,
  enviarInvitacionEmpleado,
  enviarNotificacionGestion,
  enviarCorreoSoporte,
  buildSupportSubject,
  enviarAvisoRenovacionLegacy,
  SUPPORT_EMAIL,
};
