const crypto = require('crypto');
const path = require('path');
const nodemailer = require('nodemailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 60;
const WELCOME_TOKEN_TTL_DAYS = Number(process.env.WELCOME_TOKEN_TTL_DAYS) || 7;
const WELCOME_TOKEN_TTL_MINUTES = WELCOME_TOKEN_TTL_DAYS * 24 * 60;

const LOGO_PATH = path.resolve(__dirname, 'images/Logo-Horizontal INCOR-RGB.png');

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

const formatTtlTexto = (ttlMinutos) => {
  if (ttlMinutos >= 24 * 60) {
    const dias = Math.round(ttlMinutos / (24 * 60));
    return `${dias} día${dias === 1 ? '' : 's'}`;
  }
  return `${ttlMinutos} minutos`;
};

const buildTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: parseInt(process.env.SMTP_PORT, 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const logoAttachment = () => [
  {
    filename: 'logo.png',
    path: LOGO_PATH,
    cid: 'logo',
  },
];

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
                <img src="cid:logo" alt="Ficha en el Trabajo" width="160" style="display:inline-block; max-width:160px; height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="height:4px; background:linear-gradient(90deg,#2BA9E0 0%,#E0529C 100%); background-color:#2BA9E0; font-size:0; line-height:0;">&nbsp;</td>
            </tr>
            ${cuerpoHtml}
            <tr>
              <td style="padding:24px 40px; background-color:#f9fafb; border-top:1px solid #eee; font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0; font-size:12px; color:#999;">© ${new Date().getFullYear()} Inclusión Corporativa · Ficha en el Trabajo</p>
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

  const enlace = `${FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(usuario.email)}`;
  return { enlace, rawToken };
};

const buildResetEmailHtml = ({ nombre, enlace, ttlTexto }) =>
  emailLayout(`
    <tr>
      <td style="padding:36px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif;">
        <h1 style="margin:0 0 16px 0; font-size:22px; color:#0f1020;">Restablecer contraseña</h1>
        <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">Hola <strong>${nombre}</strong>,</p>
        <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">
          Hemos recibido una solicitud para establecer la contraseña de tu cuenta en <strong>Ficha en el Trabajo</strong>.
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
        <h1 style="margin:0 0 16px 0; font-size:22px; color:#0f1020;">Invitación a Ficha en el Trabajo</h1>
        <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">Hola <strong>${nombre}</strong>,</p>
        <p style="margin:0 0 20px 0; font-size:15px; line-height:1.6; color:#444;">
          Has sido invitado a unirte a <strong>${nombreEmpresa}</strong> en la plataforma <strong>Ficha en el Trabajo</strong>.
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
  ttlTexto,
  urlApp,
}) =>
  emailLayout(`
    <tr>
      <td style="padding:36px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif;">
        <h1 style="margin:0 0 16px 0; font-size:22px; color:#0f1020;">Bienvenido a Ficha en el Trabajo</h1>
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
        <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#444;">
          Para empezar, crea tu contraseña con el botón siguiente. El enlace es válido durante <strong>${ttlTexto}</strong>.
        </p>
      </td>
    </tr>
    ${bloqueBotonEnlace(enlace, 'Crear mi contraseña')}
  `);

const enviarCorreo = async ({ to, subject, html }) => {
  const transporter = buildTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
    attachments: logoAttachment(),
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
      subject: 'Ficha en el Trabajo - Restablece tu contraseña',
      html: buildResetEmailHtml({
        nombre: usuario.nombre,
        enlace,
        ttlTexto,
      }),
    });
  } catch (mailError) {
    console.error('Error enviando email de reset:', mailError.message);
    throw mailError;
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
  } = datosEmpresa;

  try {
    await enviarCorreo({
      to: usuario.email,
      subject: 'Ficha en el Trabajo - Bienvenida y acceso a tu empresa',
      html: buildWelcomeEmailHtml({
        nombre: usuario.nombre,
        nombreEmpresa,
        licencias,
        alias: alias || '',
        identificadorFiscal: identificadorFiscal || '',
        emailLogin: usuario.email,
        enlace,
        ttlTexto,
        urlApp: FRONTEND_URL,
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
      subject: 'Ficha en el Trabajo - Invitación para crear tu contraseña',
      html: buildInvitacionEmpleadoHtml({
        nombre: usuario.nombre,
        nombreEmpresa: nombreEmpresa || 'tu empresa',
        emailLogin: usuario.email,
        enlace,
        ttlTexto,
        urlApp: FRONTEND_URL,
      }),
    });
  } catch (mailError) {
    console.error('Error enviando email de invitación:', mailError.message);
    throw mailError;
  }

  return enlace;
};

module.exports = {
  hashToken,
  RESET_TOKEN_TTL_MINUTES,
  WELCOME_TOKEN_TTL_MINUTES,
  WELCOME_TOKEN_TTL_DAYS,
  generarYEnviarReset,
  enviarBienvenidaEmpresa,
  enviarInvitacionEmpleado,
};
