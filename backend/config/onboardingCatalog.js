const { BRAND_NAME } = require('./brand');

/** Versión del checklist; subir al cambiar pasos en producto. */
const ONBOARDING_VERSION = 1;

const PASOS_SUPER_GESTOR = [
  {
    codigo: 'datos_empresa',
    titulo: 'Datos de la empresa',
    descripcion: 'Comunidad autónoma y datos básicos para festivos.',
    ruta: '/settings/empresa',
    manual: false,
  },
  {
    codigo: 'jornada',
    titulo: 'Tipos de jornada',
    descripcion: 'Define horarios y reglas de fichaje.',
    ruta: '/settings/jornada',
    manual: false,
  },
  {
    codigo: 'calendario_festivos',
    titulo: 'Calendario y festivos',
    descripcion: 'Revisa festivos oficiales y días no laborables.',
    ruta: '/calendar',
    manual: false,
  },
  {
    codigo: 'alta_personal',
    titulo: 'Añadir personal',
    descripcion: 'Invita a las personas trabajadoras de tu equipo.',
    ruta: '/users',
    manual: false,
  },
  {
    codigo: 'fichar_prueba',
    titulo: 'Probar un fichaje',
    descripcion: 'Registra una entrada para ver cómo funciona.',
    ruta: '/home',
    manual: false,
  },
  {
    codigo: 'mi_perfil',
    titulo: 'Completar tu perfil',
    descripcion: 'Revisa tu DNI y datos de contacto.',
    ruta: '/mi-perfil',
    manual: false,
  },
  {
    codigo: 'revisar_notificaciones',
    titulo: 'Bandeja de notificaciones',
    descripcion: 'Entiende cómo aprobar solicitudes del equipo.',
    ruta: '/notifications',
    manual: true,
  },
];

const PASOS_GESTOR = [
  {
    codigo: 'jornada',
    titulo: 'Tipos de jornada',
    descripcion: 'Consulta los horarios configurados.',
    ruta: '/settings/jornada',
    manual: false,
  },
  {
    codigo: 'calendario_festivos',
    titulo: 'Calendario y festivos',
    descripcion: 'Festivos y días no laborables de la empresa.',
    ruta: '/calendar',
    manual: false,
  },
  {
    codigo: 'alta_personal',
    titulo: 'Añadir personal',
    descripcion: 'Da de alta personas trabajadoras o supervisores.',
    ruta: '/users',
    manual: false,
  },
  {
    codigo: 'fichar_prueba',
    titulo: 'Probar un fichaje',
    descripcion: 'Registra una entrada de prueba.',
    ruta: '/home',
    manual: false,
  },
  {
    codigo: 'mi_perfil',
    titulo: 'Completar tu perfil',
    descripcion: 'Revisa tu DNI y datos de contacto.',
    ruta: '/mi-perfil',
    manual: false,
  },
  {
    codigo: 'revisar_notificaciones',
    titulo: 'Bandeja de notificaciones',
    descripcion: 'Aprueba correcciones y cierres del equipo.',
    ruta: '/notifications',
    manual: true,
  },
];

const PASOS_PERSONAL = [
  {
    codigo: 'mi_perfil',
    titulo: 'Completar tu perfil',
    descripcion: 'Revisa tu DNI y datos personales.',
    ruta: '/mi-perfil',
    manual: false,
  },
  {
    codigo: 'fichar_prueba',
    titulo: 'Fichar entrada',
    descripcion: 'Registra tu primera entrada de jornada.',
    ruta: '/home',
    manual: false,
  },
  {
    codigo: 'gestion_tiempo',
    titulo: 'Ver tus registros',
    descripcion: 'Consulta tu historial en Gestión tiempo.',
    ruta: '/time-logs',
    manual: true,
  },
  {
    codigo: 'revisar_notificaciones',
    titulo: 'Tus notificaciones',
    descripcion: 'Sigue el estado de tus solicitudes.',
    ruta: '/notifications',
    manual: true,
  },
];

const PLANTILLAS = {
  super_gestor: PASOS_SUPER_GESTOR,
  gestor: PASOS_GESTOR,
  personal: PASOS_PERSONAL,
};

const TITULOS_PLANTILLA = {
  super_gestor: `Aprende a usar ${BRAND_NAME}`,
  gestor: `Aprende a usar ${BRAND_NAME}`,
  personal: `Aprende a usar ${BRAND_NAME}`,
};

const plantillaDesdeTipoUsuario = (tipo) => {
  const t = Number(tipo);
  if ([1, 2, 3].includes(t)) return 'super_gestor';
  if (t === 4) return 'gestor';
  if (t === 5) return 'personal';
  return null;
};

const pasosParaPlantilla = (plantilla) => PLANTILLAS[plantilla] || [];

module.exports = {
  ONBOARDING_VERSION,
  PLANTILLAS,
  TITULOS_PLANTILLA,
  plantillaDesdeTipoUsuario,
  pasosParaPlantilla,
};
