/**
 * Planes comerciales (landing y gating futuro).
 * Ver docs/planes-licencias.md
 */

export const PLAN_IDS = ['esencial', 'rrhh', 'completo'];

/** Descuento anual: pago de 10 meses (2 meses gratis, ~17 %). */
export const ANNUAL_DISCOUNT_LABEL = '2 meses gratis';

/** Qué planes incluyen cada feature (para middleware/UI futuro). */
export const PLAN_FEATURES = {
  fichaje: PLAN_IDS,
  bolsa_horas: PLAN_IDS,
  exportaciones: PLAN_IDS,
  inspector: PLAN_IDS,
  ausencias_basicas: PLAN_IDS,
  vacaciones: ['rrhh', 'completo'],
  nominas: ['rrhh', 'completo'],
  multiempresa: ['rrhh', 'completo'],
  whatsapp_fichaje: ['completo'],
  informes_productividad: ['completo'],
};

export const planIncluyeFeature = (planId, featureKey) =>
  (PLAN_FEATURES[featureKey] || []).includes(planId);

/** Filas de la comparativa en landing. */
export const PLAN_COMPARISON_ROWS = [
  {
    id: 'fichaje',
    label: 'Fichaje web y móvil (entrada, salida, pausa)',
    plans: { esencial: true, rrhh: true, completo: true },
  },
  {
    id: 'geo',
    label: 'Geolocalización en fichajes',
    plans: { esencial: true, rrhh: true, completo: true },
  },
  {
    id: 'jornadas',
    label: 'Jornadas, festivos y cierres mensuales',
    plans: { esencial: true, rrhh: true, completo: true },
  },
  {
    id: 'personal',
    label: 'Gestión de personal, supervisores e invitaciones',
    plans: { esencial: true, rrhh: true, completo: true },
  },
  {
    id: 'ausencias_basicas',
    label: 'Ausencias básicas (baja, asuntos propios, otros)',
    plans: { esencial: true, rrhh: true, completo: true },
  },
  {
    id: 'bolsa_horas',
    label: 'Bolsa de horas y tipos de hora',
    plans: { esencial: true, rrhh: true, completo: true },
  },
  {
    id: 'inspector',
    label: 'Perfil inspector',
    plans: { esencial: true, rrhh: true, completo: true },
  },
  {
    id: 'exportaciones',
    label: 'Exportaciones PDF y Excel',
    plans: { esencial: true, rrhh: true, completo: true },
  },
  {
    id: 'vacaciones',
    label: 'Vacaciones (saldos, solicitudes y aprobación)',
    plans: { esencial: false, rrhh: true, completo: true },
  },
  {
    id: 'nominas',
    label: 'Nóminas y prenómina',
    plans: { esencial: false, rrhh: true, completo: true },
  },
  {
    id: 'multiempresa',
    label: 'Multiempresa (varias sociedades)',
    plans: { esencial: false, rrhh: true, completo: true },
  },
  {
    id: 'whatsapp_fichaje',
    label: 'Fichaje por WhatsApp',
    plans: { esencial: false, rrhh: false, completo: true },
  },
  {
    id: 'informes_productividad',
    label: 'Informes de rendimiento y productividad',
    plans: { esencial: false, rrhh: false, completo: true },
  },
];

export const PLANS = [
  {
    id: 'esencial',
    name: 'Esencial',
    description: 'Control horario digital: fichaje, cierres, bolsa de horas e informes para inspección.',
    priceMonthly: '2,50',
    priceAnnual: '25',
    minLicenses: 5,
    minMonthly: '12,50',
    variant: 'cyan',
    featured: false,
    available: true,
    features: [
      'Fichaje, pausas y geolocalización',
      'Bolsa de horas y cierre mensual firmado',
      'Inspector y exportaciones PDF/Excel',
      'Ausencias básicas (sin módulo vacaciones)',
    ],
  },
  {
    id: 'rrhh',
    name: 'RRHH',
    description: 'Esencial más vacaciones, nóminas y multiempresa para gestorías y pymes.',
    priceMonthly: '3,90',
    priceAnnual: '39',
    minLicenses: 10,
    minMonthly: '39,00',
    variant: 'purple',
    featured: true,
    available: true,
    features: [
      'Todo Esencial',
      'Vacaciones con saldo y aprobación',
      'Nóminas y prenómina',
      'Multiempresa (varias sociedades)',
    ],
  },
  {
    id: 'completo',
    name: 'Completo',
    description: 'RRHH más fichaje por WhatsApp e informes de rendimiento y productividad.',
    priceMonthly: '5,90',
    priceAnnual: '59',
    minLicenses: 15,
    minMonthly: '88,50',
    variant: 'blue',
    featured: false,
    available: false,
    features: [
      'Todo RRHH',
      'Fichaje por WhatsApp',
      'Informes de rendimiento y productividad',
      'Soporte prioritario',
    ],
  },
];

export const getPlanMinLicencias = (planId = 'esencial') => {
  const plan = PLANS.find((p) => p.id === planId);
  return plan?.minLicenses ?? 5;
};

export const getPlanLabel = (planId = 'esencial') => {
  const plan = PLANS.find((p) => p.id === normalizePlanId(planId));
  return plan?.name ?? 'Esencial';
};

export const normalizePlanId = (planId) => {
  const id = String(planId || 'esencial').toLowerCase().trim();
  return PLAN_IDS.includes(id) ? id : 'esencial';
};

const PLAN_TAG_COLORS = {
  esencial: 'cyan',
  rrhh: 'purple',
  completo: 'blue',
};

export const getPlanTagColor = (planId) =>
  PLAN_TAG_COLORS[normalizePlanId(planId)] ?? 'default';
