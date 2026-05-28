const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const Usuario = require('../models/Usuario');

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

    if (!usuario.password_hash || usuario.requiere_reset_password) {
      return res.status(403).json({
        code: 'PASSWORD_RESET_REQUIRED',
        message: 'Debes establecer tu contraseña. Usa la opción de restablecer contraseña.',
      });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    usuario.ultimo_login = new Date();
    await usuario.save();

    const token = jwt.sign(
      {
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: 'Login exitoso',
      token,
      usuario: sanitizeUsuario(usuario),
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

    const rawToken = crypto.randomBytes(32).toString('hex');
    usuario.reset_token_hash = hashToken(rawToken);
    usuario.reset_token_expira = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
    await usuario.save();

    const enlace = `${FRONTEND_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    try {
      const transporter = buildTransporter();
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Ficha en el Trabajo - Restablece tu contraseña',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Restablecer contraseña</h2>
            <p>Hola ${usuario.nombre},</p>
            <p>Hemos recibido una solicitud para establecer tu contraseña.</p>
            <p>Haz clic en el siguiente botón para continuar (el enlace caduca en ${RESET_TOKEN_TTL_MINUTES} minutos):</p>
            <p>
              <a href="${enlace}" style="background-color:#007BFF;color:#fff;padding:10px 20px;text-decoration:none;border-radius:5px;">
                Establecer contraseña
              </a>
            </p>
            <p>Si el botón no funciona, copia y pega esta URL en tu navegador:</p>
            <p><a href="${enlace}">${enlace}</a></p>
            <p>Si no solicitaste esto, ignora este correo.</p>
          </div>
        `,
      });
    } catch (mailError) {
      console.error('Error enviando email de reset:', mailError.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({ ...respuestaGenerica, devToken: rawToken, devResetUrl: enlace });
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
