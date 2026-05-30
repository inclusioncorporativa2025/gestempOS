const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const Empresa = require('../models/Empresa');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRATION
const FRONTEND_URL = process.env.FRONTEND_URL
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 60;
const BCRYPT_ROUNDS = 10;

const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

const sanitizeUsuario = (usuario) => ({
  id_usuario: usuario.id_usuario,
  nombre: usuario.nombre,
  email: usuario.email,
  tipo_usuario: usuario.tipo_usuario,
  dni: usuario.dni,
  activo: usuario.activo,
});

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

const buildResetEmailHtml = ({ nombre, enlace, ttlMinutos }) => `
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
              <td style="background-color:#fffff; padding:28px 0; text-align:center;">
                <img src="cid:logo" alt="Ficha en el Trabajo" width="160" style="display:inline-block; max-width:160px; height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="height:4px; background:linear-gradient(90deg,#2BA9E0 0%,#E0529C 100%); background-color:#2BA9E0; font-size:0; line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:36px 40px 8px 40px; font-family:Arial,Helvetica,sans-serif;">
                <h1 style="margin:0 0 16px 0; font-size:22px; color:#0f1020;">Restablecer contraseña</h1>
                <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">Hola <strong>${nombre}</strong>,</p>
                <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:#444;">
                  Hemos recibido una solicitud para establecer la contraseña de tu cuenta en <strong>Ficha en el Trabajo</strong>.
                </p>
                <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#444;">
                  Pulsa el botón para continuar. Por seguridad, el enlace caduca en <strong>${ttlMinutos} minutos</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 32px 40px; text-align:center; font-family:Arial,Helvetica,sans-serif;">
                <a href="${enlace}" style="display:inline-block; background:linear-gradient(90deg,#2BA9E0 0%,#E0529C 100%); background-color:#2BA9E0; color:#ffffff; font-size:16px; font-weight:bold; text-decoration:none; padding:14px 36px; border-radius:8px;">
                  Establecer contraseña
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
            <tr>
              <td style="padding:24px 40px; background-color:#f9fafb; border-top:1px solid #eee; font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0 0 6px 0; font-size:12px; color:#999;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
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

/**
 * Genera un token de restablecimiento, lo guarda en el usuario y envía
 * el correo con el enlace para establecer la contraseña.
 *
 * @param {object} usuario  Instancia Sequelize del usuario
 * @returns {Promise<string>} URL de restablecimiento (útil para devolverla en desarrollo)
 */
const generarYEnviarReset = async (usuario) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  usuario.reset_token_hash = hashToken(rawToken);
  usuario.reset_token_expira = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  await usuario.save();

  const enlace = `${FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(usuario.email)}`;

  try {
    const transporter = buildTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: usuario.email,
      subject: 'Ficha en el Trabajo - Restablece tu contraseña',
      html: buildResetEmailHtml({
        nombre: usuario.nombre,
        enlace,
        ttlMinutos: RESET_TOKEN_TTL_MINUTES,
      }),
      attachments: [
        {
          filename: 'logo.png',
          path: path.resolve(__dirname, '../utils/images/Logo-Horizontal INCOR-RGB.png'),
          cid: 'logo',
        },
      ],
    });
  } catch (mailError) {
    console.error('Error enviando email de reset:', mailError.message);
  }

  return enlace;
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
  }

  try {
    const usuario = await Usuario.findOne({ where: { email, fecha_baja: null } });

    if (!usuario || usuario.activo === false) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Usuario sin contraseña establecida (p.ej. migración) o que requiere reset:
    // enviamos automáticamente el correo para que establezca su contraseña.
    if (!usuario.password_hash || usuario.requiere_reset_password) {
      const enlace = await generarYEnviarReset(usuario);

      const respuesta = {
        code: 'PASSWORD_RESET_REQUIRED',
        message: 'Tras mejoras en el sistema, por motivos de seguridad debes restablecer la contraseña. Se te ha enviado un correo con los pasos a seguir.',
      };

      if (process.env.NODE_ENV !== 'production') {
        respuesta.devResetUrl = enlace;
      }

      return res.status(403).json(respuesta);
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    usuario.ultimo_login = new Date();
    await usuario.save();

    let id_empresa = null;
    let nombre_empresa = null;
    let alias = null;

    const usuarioEmpresa = await UsuarioEmpresa.findOne({
      where: { id_usuario: usuario.id_usuario, fecha_baja: null },
    });

    if (usuarioEmpresa) {
      const empresa = await Empresa.findOne({
        where: { id_empresa: usuarioEmpresa.id_empresa, fecha_baja: null },
      });
      if (empresa) {
        id_empresa = empresa.id_empresa;
        nombre_empresa = empresa.nombre;
        alias = empresa.alias;
      }
    }

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
        nombre: usuario.nombre,
        id_empresa,
        nombre_empresa,
        alias,
        esquema: id_empresa,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: 'Login exitoso',
      token,
      usuario: sanitizeUsuario(usuario),
      empresa: id_empresa
        ? { id_empresa, nombre: nombre_empresa, alias }
        : null,
    });
  } catch (error) {
    console.error('Error en login:', error.message);
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  const respuestaGenerica = {
    message: 'Si el email existe, recibirás un correo con instrucciones para restablecer la contraseña.',
  };

  if (!email) {
    return res.status(400).json({ message: 'El email es obligatorio' });
  }

  try {
    const usuario = await Usuario.findOne({ where: { email, fecha_baja: null } });

    if (!usuario || usuario.activo === false) {
      return res.status(200).json(respuestaGenerica);
    }

    const enlace = await generarYEnviarReset(usuario);

    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({ ...respuestaGenerica, devResetUrl: enlace });
    }

    return res.status(200).json(respuestaGenerica);
  } catch (error) {
    console.error('Error en forgotPassword:', error.message);
    return res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
};

const resetPassword = async (req, res) => {
  const { email, token, password } = req.body;

  if (!email || !token || !password) {
    return res.status(400).json({ message: 'Email, token y contraseña son obligatorios' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const usuario = await Usuario.findOne({
      where: {
        email,
        fecha_baja: null,
        reset_token_hash: hashToken(token),
        reset_token_expira: { [Op.gt]: new Date() },
      },
    });

    if (!usuario) {
      return res.status(400).json({ message: 'El enlace no es válido o ha caducado' });
    }

    usuario.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    usuario.requiere_reset_password = false;
    usuario.email_verificado = true;
    usuario.reset_token_hash = null;
    usuario.reset_token_expira = null;
    await usuario.save();

    return res.status(200).json({ message: 'Contraseña establecida correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en resetPassword:', error.message);
    return res.status(500).json({ message: 'Error al restablecer la contraseña' });
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword,
};
