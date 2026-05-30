const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Usuario = require('../models/Usuario');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const Empresa = require('../models/Empresa');
const { hashToken, generarYEnviarReset } = require('../utils/mailService');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRATION;
const BCRYPT_ROUNDS = 10;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'soporte@fichaeneltrabajo.es';

/** Tipos de plataforma: no exigen empresa activa en el login */
const TIPOS_PLATAFORMA = [1, 2];

const usuarioActivo = (usuario) =>
  usuario && usuario.activo !== false && usuario.activo !== 0;

const empresaEstaOperativa = (empresa) =>
  empresa &&
  !empresa.fecha_baja &&
  empresa.activo !== false &&
  empresa.activo !== 0;

const obtenerEmpresaDelUsuario = async (idUsuario) => {
  const usuarioEmpresa = await UsuarioEmpresa.findOne({
    where: { id_usuario: idUsuario, fecha_baja: null },
  });

  if (!usuarioEmpresa) {
    return { usuarioEmpresa: null, empresa: null };
  }

  const empresa = await Empresa.findOne({
    where: { id_empresa: usuarioEmpresa.id_empresa },
  });

  return { usuarioEmpresa, empresa };
};

/**
 * Usuarios de empresa (3–6) solo pueden autenticarse si su empresa está activa y sin baja.
 */
const validarAccesoEmpresa = (usuario, empresa, usuarioEmpresa) => {
  const tipo = Number(usuario.tipo_usuario);

  if (TIPOS_PLATAFORMA.includes(tipo)) {
    return null;
  }

  if (!usuarioEmpresa) {
    return {
      status: 403,
      code: 'EMPRESA_NO_VINCULADA',
      message:
        'Su usuario no está vinculado a ninguna empresa. Contacte con el administrador de la plataforma.',
    };
  }

  if (!empresaEstaOperativa(empresa)) {
    return {
      status: 403,
      code: 'EMPRESA_INACTIVA',
      message:
        'La empresa asociada a su cuenta no está activa o ha sido dada de baja. Contacte con el administrador de la plataforma.',
    };
  }

  return null;
};

const sanitizeUsuario = (usuario) => ({
  id_usuario: usuario.id_usuario,
  nombre: usuario.nombre,
  email: usuario.email,
  tipo_usuario: usuario.tipo_usuario,
  dni: usuario.dni,
  activo: usuario.activo,
});

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
  }

  try {
    const usuario = await Usuario.findOne({ where: { email, fecha_baja: null } });

    if (!usuarioActivo(usuario)) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const { usuarioEmpresa, empresa } = await obtenerEmpresaDelUsuario(usuario.id_usuario);
    const bloqueoEmpresa = validarAccesoEmpresa(usuario, empresa, usuarioEmpresa);
    if (bloqueoEmpresa) {
      return res.status(bloqueoEmpresa.status).json({
        code: bloqueoEmpresa.code,
        message: bloqueoEmpresa.message,
        supportEmail: bloqueoEmpresa.supportEmail,
      });
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

    if (empresaEstaOperativa(empresa)) {
      id_empresa = empresa.id_empresa;
      nombre_empresa = empresa.nombre;
      alias = empresa.alias;
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

    if (!usuarioActivo(usuario)) {
      return res.status(200).json(respuestaGenerica);
    }

    const { usuarioEmpresa, empresa } = await obtenerEmpresaDelUsuario(usuario.id_usuario);
    if (validarAccesoEmpresa(usuario, empresa, usuarioEmpresa)) {
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
