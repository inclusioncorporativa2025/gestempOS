const OnboardingUsuario = require('../models/OnboardingUsuario');
const OnboardingUsuarioPaso = require('../models/OnboardingUsuarioPaso');
const UsuarioEmpresa = require('../models/UsuarioEmpresa');
const Empresa = require('../models/Empresa');
const Usuario = require('../models/Usuario');
const Jornada = require('../models/Jornada');
const FestivoEmpresa = require('../models/FestivoEmpresa');
const Fichajes = require('../models/Fichajes');
const { obtenerMembresiaActiva } = require('./usuarioEmpresaService');
const {
  ONBOARDING_VERSION,
  TITULOS_PLANTILLA,
  plantillaDesdeTipoUsuario,
  pasosParaPlantilla,
} = require('../config/onboardingCatalog');

const resolverTipoOnboarding = (user) => {
  const tipoSesion = Number(user?.tipo_usuario);
  const tipoEmpresa = user?.tipo_usuario_empresa != null
    ? Number(user.tipo_usuario_empresa)
    : null;

  if ([1, 2, 3, 4, 5].includes(tipoSesion)) {
    return tipoSesion;
  }
  if (tipoEmpresa != null) {
    return tipoEmpresa;
  }
  return tipoSesion;
};

const evaluarAutoPaso = async (codigo, ctx) => {
  const { idEmpresa, idUsuario } = ctx;

  switch (codigo) {
    case 'datos_empresa': {
      const empresa = await Empresa.findByPk(idEmpresa, {
        attributes: ['codigo_region_festivos', 'nombre'],
      });
      return Boolean(String(empresa?.codigo_region_festivos || '').trim());
    }
    case 'jornada': {
      const n = await Jornada.count({ where: { empresa_id: idEmpresa } });
      return n > 0;
    }
    case 'calendario_festivos': {
      const n = await FestivoEmpresa.count({ where: { empresa_id: idEmpresa } });
      return n > 0;
    }
    case 'alta_personal': {
      const n = await UsuarioEmpresa.count({
        where: {
          id_empresa: idEmpresa,
          tipo_usuario: 5,
          activo: true,
          fecha_baja: null,
        },
      });
      return n >= 1;
    }
    case 'fichar_prueba': {
      const n = await Fichajes.count({
        where: { empresa_id: idEmpresa, id_usuario: idUsuario },
      });
      return n >= 1;
    }
    case 'mi_perfil': {
      const usuario = await Usuario.findByPk(idUsuario, { attributes: ['dni'] });
      return Boolean(String(usuario?.dni || '').trim());
    }
    default:
      return false;
  }
};

const upsertPaso = async (idOnboarding, codigo, hecho, origen) => {
  const now = new Date();
  const [row, created] = await OnboardingUsuarioPaso.findOrCreate({
    where: { id_onboarding_usuario: idOnboarding, codigo_paso: codigo },
    defaults: {
      hecho: Boolean(hecho),
      hecho_en: hecho ? now : null,
      origen,
      fecha_alta: now,
    },
  });

  if (created || !hecho || row.hecho) {
    return row;
  }

  await row.update({
    hecho: true,
    hecho_en: now,
    origen,
    fecha_modificacion: now,
  });
  return row;
};

const resetOnboardingPorCambioPlantilla = async (registro, plantillaNueva) => {
  await OnboardingUsuarioPaso.destroy({
    where: { id_onboarding_usuario: registro.id_onboarding_usuario },
  });
  await registro.update({
    plantilla: plantillaNueva,
    estado: 'activo',
    version: ONBOARDING_VERSION,
    cerrado_en: null,
    fecha_modificacion: new Date(),
  });
};

const sincronizarPasos = async (registro, plantilla, ctx) => {
  const catalogo = pasosParaPlantilla(plantilla);
  const pasosDb = await OnboardingUsuarioPaso.findAll({
    where: { id_onboarding_usuario: registro.id_onboarding_usuario },
  });
  const porCodigo = new Map(pasosDb.map((p) => [p.codigo_paso, p]));

  for (const paso of catalogo) {
    let hecho = false;
    let origen = 'auto';

    if (paso.manual) {
      const existente = porCodigo.get(paso.codigo);
      hecho = Boolean(existente?.hecho);
      origen = existente?.origen || 'manual';
    } else {
      hecho = await evaluarAutoPaso(paso.codigo, ctx);
      origen = 'auto';
    }

    await upsertPaso(registro.id_onboarding_usuario, paso.codigo, hecho, origen);
  }
};

const construirRespuestaPasos = async (idOnboarding, plantilla) => {
  const catalogo = pasosParaPlantilla(plantilla);
  const pasosDb = await OnboardingUsuarioPaso.findAll({
    where: { id_onboarding_usuario: idOnboarding },
  });
  const porCodigo = new Map(pasosDb.map((p) => [p.codigo_paso, p]));

  return catalogo.map((def) => {
    const row = porCodigo.get(def.codigo);
    return {
      codigo: def.codigo,
      titulo: def.titulo,
      descripcion: def.descripcion,
      ruta: def.ruta,
      manual: def.manual,
      hecho: Boolean(row?.hecho),
      hecho_en: row?.hecho_en ?? null,
      origen: row?.origen ?? null,
    };
  });
};

const obtenerEstadoOnboarding = async ({ user, idEmpresa }) => {
  const idUsuario = Number(user?.id_usuario);
  const empresaId = Number(idEmpresa);

  if (!idUsuario || !empresaId) {
    return {
      mostrar: false,
      motivo: 'sin_empresa',
      pasos: [],
    };
  }

  const tipo = resolverTipoOnboarding(user);
  const plantilla = plantillaDesdeTipoUsuario(tipo);
  if (!plantilla) {
    return {
      mostrar: false,
      motivo: 'rol_sin_onboarding',
      pasos: [],
    };
  }

  const membresia = await obtenerMembresiaActiva(idUsuario, empresaId);
  if (!membresia) {
    return {
      mostrar: false,
      motivo: 'sin_membresia',
      pasos: [],
    };
  }

  const ctx = { idEmpresa: empresaId, idUsuario, plantilla };

  let [registro] = await OnboardingUsuario.findOrCreate({
    where: { id_usuario_empresa: membresia.id_usuario_empresa },
    defaults: {
      plantilla,
      estado: 'activo',
      version: ONBOARDING_VERSION,
      fecha_alta: new Date(),
    },
  });

  if (registro.plantilla !== plantilla) {
    await resetOnboardingPorCambioPlantilla(registro, plantilla);
    registro = await OnboardingUsuario.findByPk(registro.id_onboarding_usuario);
  } else if (Number(registro.version) < ONBOARDING_VERSION) {
    await registro.update({
      version: ONBOARDING_VERSION,
      estado: 'activo',
      cerrado_en: null,
      fecha_modificacion: new Date(),
    });
  }

  if (registro.estado === 'activo') {
    await sincronizarPasos(registro, plantilla, ctx);
  }

  const pasos = await construirRespuestaPasos(registro.id_onboarding_usuario, plantilla);
  const total = pasos.length;
  const completados = pasos.filter((p) => p.hecho).length;
  const todosCompletados = total > 0 && completados === total;
  const mostrar = registro.estado === 'activo';

  return {
    mostrar,
    estado: registro.estado,
    plantilla,
    titulo: TITULOS_PLANTILLA[plantilla] || 'Guía de inicio',
    version: registro.version,
    completados,
    total,
    todosCompletados,
    pasos,
  };
};

/** Cierre tras completar todos los pasos de verdad (solo X en pantalla de felicitación). */
const cerrarOnboarding = async ({ user, idEmpresa }) => {
  const idUsuario = Number(user.id_usuario);
  const empresaId = Number(idEmpresa);
  const membresia = await obtenerMembresiaActiva(idUsuario, empresaId);
  if (!membresia) {
    throw Object.assign(new Error('Sin membresía activa'), { status: 403 });
  }

  const registro = await OnboardingUsuario.findOne({
    where: { id_usuario_empresa: membresia.id_usuario_empresa, estado: 'activo' },
  });
  if (!registro) {
    return obtenerEstadoOnboarding({ user, idEmpresa });
  }

  const plantilla = registro.plantilla;
  const pasos = await construirRespuestaPasos(registro.id_onboarding_usuario, plantilla);
  const todosCompletados = pasos.length > 0 && pasos.every((p) => p.hecho);
  if (!todosCompletados) {
    throw Object.assign(
      new Error('Aún faltan pasos por completar'),
      { status: 400 },
    );
  }

  const now = new Date();
  await registro.update({
    estado: 'completado',
    cerrado_en: now,
    fecha_modificacion: now,
  });

  return {
    mostrar: false,
    estado: 'completado',
    plantilla,
    titulo: TITULOS_PLANTILLA[plantilla] || 'Guía de inicio',
    version: registro.version,
    completados: pasos.length,
    total: pasos.length,
    todosCompletados: true,
    pasos,
  };
};

/** Cierre definitivo (X): no vuelve a mostrarse; todos los pasos quedan marcados como hechos. */
const omitirOnboarding = async ({ user, idEmpresa }) => {
  const idUsuario = Number(user.id_usuario);
  const empresaId = Number(idEmpresa);
  const tipo = resolverTipoOnboarding(user);
  const plantilla = plantillaDesdeTipoUsuario(tipo);
  if (!plantilla) {
    return obtenerEstadoOnboarding({ user, idEmpresa });
  }

  const membresia = await obtenerMembresiaActiva(idUsuario, empresaId);
  if (!membresia) {
    throw Object.assign(new Error('Sin membresía activa'), { status: 403 });
  }

  const catalogo = pasosParaPlantilla(plantilla);
  const now = new Date();

  const [registro] = await OnboardingUsuario.findOrCreate({
    where: { id_usuario_empresa: membresia.id_usuario_empresa },
    defaults: {
      plantilla,
      estado: 'activo',
      version: ONBOARDING_VERSION,
      fecha_alta: now,
    },
  });

  for (const paso of catalogo) {
    await upsertPaso(registro.id_onboarding_usuario, paso.codigo, true, 'manual');
  }

  await registro.update({
    estado: 'completado',
    cerrado_en: now,
    fecha_modificacion: now,
  });

  const pasos = await construirRespuestaPasos(registro.id_onboarding_usuario, plantilla);

  return {
    mostrar: false,
    estado: 'completado',
    plantilla,
    titulo: TITULOS_PLANTILLA[plantilla] || 'Guía de inicio',
    version: registro.version,
    completados: pasos.length,
    total: pasos.length,
    pasos,
  };
};

const marcarPasoManual = async ({ user, idEmpresa, codigoPaso, visitaRuta }) => {
  const idUsuario = Number(user.id_usuario);
  const empresaId = Number(idEmpresa);
  const tipo = resolverTipoOnboarding(user);
  const plantilla = plantillaDesdeTipoUsuario(tipo);
  if (!plantilla) {
    throw Object.assign(new Error('Rol sin onboarding'), { status: 400 });
  }

  const catalogo = pasosParaPlantilla(plantilla);
  let codigo = codigoPaso;

  if (!codigo && visitaRuta) {
    const ruta = String(visitaRuta).split('?')[0];
    const match = catalogo.find((p) => p.ruta === ruta && p.manual);
    codigo = match?.codigo;
  }

  if (!codigo) {
    throw Object.assign(new Error('Paso no válido'), { status: 400 });
  }

  const def = catalogo.find((p) => p.codigo === codigo);
  if (!def?.manual) {
    throw Object.assign(new Error('Este paso se completa automáticamente'), { status: 400 });
  }

  const membresia = await obtenerMembresiaActiva(idUsuario, empresaId);
  if (!membresia) {
    throw Object.assign(new Error('Sin membresía activa'), { status: 403 });
  }

  const [registro] = await OnboardingUsuario.findOrCreate({
    where: { id_usuario_empresa: membresia.id_usuario_empresa },
    defaults: {
      plantilla,
      estado: 'activo',
      version: ONBOARDING_VERSION,
      fecha_alta: new Date(),
    },
  });

  if (registro.estado !== 'activo') {
    return obtenerEstadoOnboarding({ user, idEmpresa });
  }

  await upsertPaso(registro.id_onboarding_usuario, codigo, true, 'manual');

  return obtenerEstadoOnboarding({ user, idEmpresa });
};

/** Tras fichaje u otra acción: refresco ligero sin devolver payload completo al cliente. */
const refrescarOnboardingTrasAccion = async (idUsuario, idEmpresa) => {
  if (!idUsuario || !idEmpresa) return;
  const membresia = await obtenerMembresiaActiva(idUsuario, idEmpresa);
  if (!membresia) return;

  const registro = await OnboardingUsuario.findOne({
    where: {
      id_usuario_empresa: membresia.id_usuario_empresa,
      estado: 'activo',
    },
  });
  if (!registro) return;

  const tipo = Number(membresia.tipo_usuario);
  const plantilla = plantillaDesdeTipoUsuario(tipo);
  if (!plantilla) return;

  const ctx = { idEmpresa, idUsuario, plantilla };
  await sincronizarPasos(registro, plantilla, ctx);

};

module.exports = {
  obtenerEstadoOnboarding,
  cerrarOnboarding,
  omitirOnboarding,
  marcarPasoManual,
  refrescarOnboardingTrasAccion,
  resolverTipoOnboarding,
};
