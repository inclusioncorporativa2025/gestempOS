const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');
const { hashToken, generarYEnviarReset } = require('../utils/mailService');
const { registrarAcceso } = require('../services/accesoPlataformaService');
const { getClientIp, getUserAgent } = require('../utils/request');
const {
  TIPOS_PLATAFORMA,
  empresaEstaOperativa,
  listarMembresiasActivas,
  listarEmpresasParaSelector,
  obtenerMembresiaActiva,
  emitirJwtSesion,
  emitirPreAuthToken,
  verificarPreAuthToken,
} = require('../services/usuarioEmpresaService');
const { normalizePlanId, planIncluyeFeature } = require('../config/plans');
const { obtenerPlanEmpresa, assertEmpresaTieneFeature } = require('../services/planService');

const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_ROUNDS = 10;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'soporte@timecor.es';

const usuarioActivo = (usuario) =>
  usuario && usuario.activo !== false && usuario.activo !== 0;

const buscarUsuarioPorEmail = async (email) => {
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!emailNorm) {
    return null;
  }

  return Usuario.findOne({
    where: {
      [Op.and]: [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), emailNorm),
        { fecha_baja: null },
      ],
    },
  });
};

const responderErrorResetCorreo = (res, error, respuestaGenerica) => {
  const payload = {
    ...respuestaGenerica,
    code: error.code || 'EMAIL_SEND_FAILED',
  };

  if (process.env.NODE_ENV !== 'production' && error.enlace) {
    payload.devResetUrl = error.enlace;
  }

  if (error.code === 'SMTP_NO_CONFIGURADO') {
    return res.status(503).json({
      ...payload,
      message: `El envío de correos no está configurado en el servidor. Contacta con ${SUPPORT_EMAIL}.`,
    });
  }

  return res.status(503).json({
    ...payload,
    message: `No pudimos enviar el correo en este momento. Inténtalo más tarde o contacta con ${SUPPORT_EMAIL}.`,
  });
};

const sanitizeUsuario = (usuario) => ({
  id_usuario: usuario.id_usuario,
  nombre: usuario.nombre,
  email: usuario.email,
  tipo_usuario: usuario.tipo_usuario,
  dni: usuario.dni,
  activo: usuario.activo,
});

/**
 * Usuarios de empresa (3–6) deben tener al menos una empresa operativa vinculada.
 */
const validarAccesoEmpresa = (usuario, membresiasActivas) => {
  const tipo = Number(usuario.tipo_usuario);

  if (TIPOS_PLATAFORMA.includes(tipo)) {
    return null;
  }

  if (!membresiasActivas.length) {
    return {
      status: 403,
      code: 'EMPRESA_NO_VINCULADA',
      message:
        'Su usuario no está vinculado a ninguna empresa. Contacte con el administrador de la plataforma.',
    };
  }

  return null;
};

const completarLoginConEmpresa = async (req, res, usuario, membresia, empresa) => {
  usuario.ultimo_login = new Date();
  await usuario.save();

  await registrarAcceso({
    idUsuario: usuario.id_usuario,
    tipoEvento: 'login',
    ruta: '/login',
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    idEmpresa: empresaEstaOperativa(empresa) ? empresa.id_empresa : null,
  });

  const operativa = empresaEstaOperativa(empresa);
  const id_empresa = operativa ? empresa.id_empresa : null;
  const nombre_empresa = operativa ? empresa.nombre : null;
  const alias = operativa ? empresa.alias : null;

  const token = emitirJwtSesion(usuario, empresa, membresia);

  return res.status(200).json({
    message: 'Login exitoso',
    token,
    usuario: sanitizeUsuario(usuario),
    empresa: id_empresa
      ? {
          id_empresa,
          nombre: nombre_empresa,
          alias,
          plan: normalizePlanId(empresa?.plan),
        }
      : null,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
  }

  try {
    const usuario = await buscarUsuarioPorEmail(email);

    if (!usuarioActivo(usuario)) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const membresiasActivas = await listarMembresiasActivas(usuario.id_usuario);
    const bloqueoEmpresa = validarAccesoEmpresa(usuario, membresiasActivas);
    if (bloqueoEmpresa) {
      return res.status(bloqueoEmpresa.status).json({
        code: bloqueoEmpresa.code,
        message: bloqueoEmpresa.message,
        supportEmail: bloqueoEmpresa.supportEmail,
      });
    }

    if (!usuario.password_hash || usuario.requiere_reset_password) {
      let enlace;
      try {
        enlace = await generarYEnviarReset(usuario);
      } catch (error) {
        if (error.code === 'SMTP_NO_CONFIGURADO' || error.code === 'EMAIL_SEND_FAILED') {
          return responderErrorResetCorreo(res, error, {
            code: 'PASSWORD_RESET_REQUIRED',
            message:
              'Debes restablecer la contraseña, pero no pudimos enviar el correo. Inténtalo de nuevo o contacta con soporte.',
          });
        }
        throw error;
      }

      const respuesta = {
        code: 'PASSWORD_RESET_REQUIRED',
        message:
          'Tras mejoras en el sistema, por motivos de seguridad debes restablecer la contraseña. Se te ha enviado un correo con los pasos a seguir.',
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

    const tipo = Number(usuario.tipo_usuario);
    // ROOT (1) entra directo; admin plataforma (2) elige empresa si tiene varias
    const requiereSeleccion =
      tipo !== 1 && membresiasActivas.length > 1;

    if (requiereSeleccion) {
      const empresas = await listarEmpresasParaSelector(usuario.id_usuario, usuario);
      return res.status(200).json({
        code: 'EMPRESA_SELECTION_REQUIRED',
        message: 'Selecciona la empresa con la que deseas acceder',
        preAuthToken: emitirPreAuthToken(usuario.id_usuario),
        empresas,
        usuario: sanitizeUsuario(usuario),
      });
    }

    const { membresia, empresa } = membresiasActivas[0] ?? {
      membresia: null,
      empresa: null,
    };

    return completarLoginConEmpresa(req, res, usuario, membresia, empresa);
  } catch (error) {
    console.error('Error en login:', error.message);
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

const selectEmpresa = async (req, res) => {
  const { preAuthToken, id_empresa: idEmpresaBody } = req.body;
  const idEmpresa = Number(idEmpresaBody);

  if (!preAuthToken || !idEmpresa) {
    return res.status(400).json({ message: 'Token de selección y empresa son obligatorios' });
  }

  try {
    const payload = verificarPreAuthToken(preAuthToken);
    const usuario = await Usuario.findOne({
      where: { id_usuario: payload.id_usuario, fecha_baja: null },
    });

    if (!usuarioActivo(usuario)) {
      return res.status(401).json({ message: 'Sesión de selección no válida' });
    }

    const membresia = await obtenerMembresiaActiva(usuario.id_usuario, idEmpresa);
    if (!membresia) {
      return res.status(403).json({ message: 'No tienes acceso a esa empresa' });
    }

    const empresa = await Empresa.findByPk(idEmpresa);
    if (!empresaEstaOperativa(empresa)) {
      return res.status(403).json({
        code: 'EMPRESA_INACTIVA',
        message: 'La empresa seleccionada no está disponible en este momento.',
        supportEmail: SUPPORT_EMAIL,
      });
    }

    return completarLoginConEmpresa(req, res, usuario, membresia, empresa);
  } catch (error) {
    console.error('Error en selectEmpresa:', error.message);
    return res.status(401).json({ message: 'Token de selección inválido o caducado' });
  }
};

const switchEmpresa = async (req, res) => {
  const idEmpresa = Number(req.body?.id_empresa);

  if (!idEmpresa) {
    return res.status(400).json({ message: 'id_empresa es obligatorio' });
  }

  if (req.user.impersonacion) {
    return res.status(403).json({
      message: 'No se puede cambiar de empresa durante una sesión suplantada',
    });
  }

  try {
    const empresaActual = req.user.id_empresa
      ? await Empresa.findByPk(req.user.id_empresa)
      : null;

    const usuario = await Usuario.findOne({
      where: { id_usuario: req.user.id_usuario, fecha_baja: null },
    });

    if (!usuarioActivo(usuario)) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    const esPlataforma = TIPOS_PLATAFORMA.includes(Number(usuario.tipo_usuario));
    if (empresaActual && !esPlataforma) {
      await assertEmpresaTieneFeature(empresaActual.id_empresa, 'multiempresa');
    }

    const membresia = await obtenerMembresiaActiva(usuario.id_usuario, idEmpresa);
    if (!membresia) {
      return res.status(403).json({ message: 'No tienes acceso a esa empresa' });
    }

    const empresa = await Empresa.findByPk(idEmpresa);
    if (!empresaEstaOperativa(empresa)) {
      return res.status(403).json({
        code: 'EMPRESA_INACTIVA',
        message: 'La empresa seleccionada no está disponible en este momento.',
        supportEmail: SUPPORT_EMAIL,
      });
    }

    const token = emitirJwtSesion(usuario, empresa, membresia);

    return res.status(200).json({
      message: 'Empresa cambiada',
      token,
      empresa: {
        id_empresa: empresa.id_empresa,
        nombre: empresa.nombre,
        alias: empresa.alias,
        plan: normalizePlanId(empresa.plan),
      },
    });
  } catch (error) {
    if (error.code === 'PLAN_FEATURE_REQUIRED') {
      return res.status(403).json({
        code: error.code,
        feature: error.feature,
        plan: error.plan,
        planLabel: error.planLabel,
        message: 'El cambio de empresa requiere el plan RRHH o Completo',
      });
    }
    console.error('Error en switchEmpresa:', error.message);
    return res.status(500).json({ message: 'Error al cambiar de empresa' });
  }
};

const misEmpresas = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      where: { id_usuario: req.user.id_usuario, fecha_baja: null },
    });

    if (!usuarioActivo(usuario)) {
      return res.status(401).json({ message: 'Usuario no válido' });
    }

    const idEmpresaActiva = req.user.id_empresa ? Number(req.user.id_empresa) : null;
    const planActivo = idEmpresaActiva
      ? await obtenerPlanEmpresa(idEmpresaActiva)
      : null;

    const esPlataforma = TIPOS_PLATAFORMA.includes(Number(usuario.tipo_usuario));
    let empresas = await listarEmpresasParaSelector(usuario.id_usuario, usuario);
    const planTieneMultiempresa = planIncluyeFeature(planActivo, 'multiempresa');

    if (!esPlataforma && !planTieneMultiempresa) {
      empresas = empresas.filter((e) => e.id_empresa === idEmpresaActiva);
    }

    return res.status(200).json({
      empresas,
      empresa_activa: idEmpresaActiva,
      puede_cambiar_empresa: esPlataforma || planTieneMultiempresa,
    });
  } catch (error) {
    console.error('Error en misEmpresas:', error.message);
    return res.status(500).json({ message: 'Error al obtener empresas' });
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
    const usuario = await buscarUsuarioPorEmail(email);

    if (!usuarioActivo(usuario)) {
      return res.status(200).json(respuestaGenerica);
    }

    const membresiasActivas = await listarMembresiasActivas(usuario.id_usuario);
    if (validarAccesoEmpresa(usuario, membresiasActivas)) {
      return res.status(200).json(respuestaGenerica);
    }

    const enlace = await generarYEnviarReset(usuario);

    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({ ...respuestaGenerica, devResetUrl: enlace });
    }

    return res.status(200).json(respuestaGenerica);
  } catch (error) {
    console.error('Error en forgotPassword:', error.message, error.stack);

    if (error.code === 'SMTP_NO_CONFIGURADO' || error.code === 'EMAIL_SEND_FAILED') {
      return responderErrorResetCorreo(res, error, respuestaGenerica);
    }

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
    const usuario = await buscarUsuarioPorEmail(email);

    if (
      !usuario
      || usuario.reset_token_hash !== hashToken(token)
      || !usuario.reset_token_expira
      || usuario.reset_token_expira <= new Date()
    ) {
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
  selectEmpresa,
  switchEmpresa,
  misEmpresas,
  forgotPassword,
  resetPassword,
};
