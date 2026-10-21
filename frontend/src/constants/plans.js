/**
 * Planes comerciales (landing y gating futuro).
 * Modelo: cuota base + licencia por usuario (Stripe base+seat).
 * Ver docs/planes-licencias.md
 */

export const PLAN_IDS = ['esencial', 'rrhh', 'completo'];

/** Cupón Stripe primer año anual (2 meses gratis ≈ 16,67 %). */
export const ANNUAL_COUPON_PERCENT = 16.67;

export const ANNUAL_DISCOUNT_LABEL = 'te regalamos 2 meses';
export const ANNUAL_FREE_MONTHS_BADGE = '2 meses gratis';

/** Badge en toggle anual (simulador landing). */
export const ANNUAL_RECOMMENDED_BADGE = 'Recomendado';

/** Título del simulador en landing (SEO + intención de búsqueda). */
export const SIMULATOR_SEO_TITLE =
  'Calculadora de precios TimeCor: estima tu plan según trabajadores';

/** Cabecera sección planes en landing (SEO + intención comercial). */
export const PLANS_SECTION_SEO_TITLE =
  'Planes y precios de control horario para empresas';
export const PLANS_SECTION_SEO_LEAD =
  'Compara Esencial, RRHH y Completo: fichaje digital, cumplimiento legal, vacaciones y gestión de equipos.';

export const SIMULATOR_BILLING_QUESTION =
  '¿Qué facturación estás buscando, mensual o anual?';
export const SIMULATOR_WORKERS_QUESTION = '¿Cuántas personas trabajadoras tienes?';

/** Máximo del slider del simulador (landing). */
export const SIMULATOR_WORKERS_SLIDER_MAX = 100;
export const SIMULATOR_PLAN_QUESTION = '¿Qué plan necesitas?';

export const ANNUAL_LIST_PRICE_NOTE =
  'Primer pago anual: descuento sobre cuota base + licencias. '
  + 'Renovaciones al precio de lista, salvo promoción vigente.';

export const ANNUAL_FIRST_YEAR_LABEL = 'Total estimado primer año';
export const ANNUAL_RENEWAL_LABEL = 'Renovación (2.º año en adelante)';

export const ADMIN_CUENTA_REGALO_NOTE = 'Administrador gratis';

export const parsePrecioPlan = (value) =>
  parseFloat(String(value || '0').replace(',', '.'));

export const formatPrecioPlan = (amount) =>
  Number(amount).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const roundEuro = (n) => Math.round(Number(n) * 100) / 100;

export const getPlanBaseMonthly = (plan) =>
  parsePrecioPlan(plan?.priceBaseMonthly);

export const getPlanSeatMonthly = (plan) =>
  parsePrecioPlan(plan?.priceSeatMonthly ?? plan?.priceMonthly);

export const getPlanBaseAnnual = (plan) =>
  parsePrecioPlan(plan?.priceBaseAnnual);

export const getPlanSeatAnnual = (plan) =>
  parsePrecioPlan(plan?.priceSeatAnnual);

/** Precio de lista anual por licencia (12 meses, solo usuario). */
export const getPrecioAnualLista = (plan) => getPlanSeatAnnual(plan);

/** @deprecated Usar calcTotalAnualPrimerAno para totales de suscripción. */
export const getPrecioAnualEfectivo = (plan) => {
  const seat = getPlanSeatAnnual(plan);
  return roundEuro(seat * (1 - ANNUAL_COUPON_PERCENT / 100));
};

export const calcTotalMensual = (plan, licencias) => {
  const qty = Math.max(0, Number(licencias) || 0);
  return roundEuro(getPlanBaseMonthly(plan) + getPlanSeatMonthly(plan) * qty);
};

export const calcTotalAnualLista = (plan, licencias) => {
  const qty = Math.max(0, Number(licencias) || 0);
  return roundEuro(getPlanBaseAnnual(plan) + getPlanSeatAnnual(plan) * qty);
};

export const calcDescuentoAnualPrimerAno = (plan, licencias) => {
  const lista = calcTotalAnualLista(plan, licencias);
  return roundEuro(lista * (ANNUAL_COUPON_PERCENT / 100));
};

export const calcTotalAnualPrimerAno = (plan, licencias) =>
  roundEuro(calcTotalAnualLista(plan, licencias) - calcDescuentoAnualPrimerAno(plan, licencias));

/** @deprecated Usar calcTotalAnualPrimerAno */
export const calcTotalAnualEfectivo = (plan, licencias) =>
  calcTotalAnualPrimerAno(plan, licencias);

export const mensajePrimerAnoPorUsuario = (plan) => {
  const seatLista = getPlanSeatAnnual(plan);
  const seatEfectivo = roundEuro(seatLista * (1 - ANNUAL_COUPON_PERCENT / 100));
  const precio = formatPrecioPlan(seatEfectivo);
  return `¡Primer año ${precio} € por licencia (usuario)!`;
};

export const mensajeRenovacionPorUsuario = (plan) => {
  const lista = getPlanSeatAnnual(plan);
  const precio = Number.isInteger(lista) ? String(lista) : formatPrecioPlan(lista);
  return `Precio de renovación: ${precio} € por licencia (usuario) / año`;
};

/** Etiqueta del campo en facturación / alta (no decir solo «licencias»). */
export const USUARIOS_ACCESO_FIELD_LABEL = '¿Cuántos usuarios accederán a TimeCor?';
export const PRICES_EXCLUDE_TAX_NOTE = 'Precios sin impuestos (IVA no incluido).';

/** Debajo del título «Importe estimado» en facturación. */
export const PRICE_SUMMARY_TAX_LABEL = 'Precios sin impuestos';
export const PLAN_UNAVAILABLE_TOOLTIP =
  'No disponible por el momento, disculpen las molestias';
export const PRICE_UNIT_MONTHLY = 'usuario / mes';
export const PRICE_UNIT_ANNUAL = 'usuario / año';
export const PRICE_BASE_MONTHLY_LABEL = 'cuota base única / mes';
export const PRICE_BASE_ANNUAL_LABEL = 'cuota base única / año';
/** Facturación: el toggle indica mensual/anual (sin repetir en la tarjeta). */
export const PRICE_BASE_BILLING_LABEL = 'cuota base única';
export const PRICE_UNIT_BILLING_LABEL = 'usuario';
/** Licencias por defecto al configurar suscripción (sin mínimo por plan). */
export const DEFAULT_LICENCIAS = 1;

/** Mínimo de licencias (evita base+0 con solo admin; no bajar de usuarios en uso). */
export const MIN_LICENCIAS = 1;

export const MIN_USERS_LABEL =
  'Mín. 1 licencia · admin incluido sin consumir licencia';

export const PLAN_FEATURES = {
  fichaje: PLAN_IDS,
  bolsa_horas: PLAN_IDS,
  exportaciones: PLAN_IDS,
  inspector: PLAN_IDS,
  ausencias_basicas: ['rrhh', 'completo'],
  vacaciones: ['rrhh', 'completo'],
  nominas: ['rrhh', 'completo'],
  multiempresa: ['rrhh', 'completo'],
  whatsapp_fichaje: ['completo'],
  informes_productividad: ['completo'],
};

export const planIncluyeFeature = (planId, featureKey) =>
  (PLAN_FEATURES[featureKey] || []).includes(planId);

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
    label: 'Ausencias (bajas, permisos, formación)',
    plans: { esencial: false, rrhh: true, completo: true },
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
    priceBaseMonthly: '10',
    priceSeatMonthly: '2,50',
    priceBaseAnnual: '120',
    priceSeatAnnual: '30',
    priceMonthly: '2,50',
    minMonthly: '12,50',
    variant: 'cyan',
    featured: false,
    available: true,
    features: [
      'Fichaje, pausas y geolocalización',
      'Bolsa de horas y cierre mensual firmado',
      'Inspector y exportaciones PDF/Excel',
    ],
  },
  {
    id: 'rrhh',
    name: 'RRHH',
    description: 'Esencial + vacaciones, nóminas y multiempresa para gestorías y pymes.',
    priceBaseMonthly: '19,90',
    priceSeatMonthly: '3,50',
    priceBaseAnnual: '238,80',
    priceSeatAnnual: '42',
    priceMonthly: '3,50',
    minMonthly: '23,40',
    variant: 'purple',
    featured: true,
    available: true,
    features: [
      'Todo Esencial',
      'Ausencias (bajas, permisos, formación)',
      'Vacaciones con saldo y aprobación',
      'Nóminas y prenómina',
      'Multiempresa (varias sociedades)',
    ],
  },
  {
    id: 'completo',
    name: 'Completo',
    description: 'RRHH + fichaje por WhatsApp e informes de rendimiento y productividad.',
    priceBaseMonthly: '34,90',
    priceSeatMonthly: '4,50',
    priceBaseAnnual: '418,80',
    priceSeatAnnual: '54',
    priceMonthly: '4,50',
    minMonthly: '39,40',
    variant: 'blue',
    featured: false,
    available: true,
    features: [
      'Todo RRHH',
      'Fichaje por WhatsApp',
      'Informes de rendimiento y productividad',
      'Soporte prioritario',
    ],
  },
];

export const getPlanMinLicencias = (_planId = 'esencial') => MIN_LICENCIAS;

/** Importe mínimo de referencia: cuota base + 1 licencia. */
export const getPlanMinAnnual = (plan) =>
  formatPrecioPlan(calcTotalAnualPrimerAno(plan, DEFAULT_LICENCIAS));

export const getPlanMinAnnualLista = (plan) =>
  formatPrecioPlan(calcTotalAnualLista(plan, DEFAULT_LICENCIAS));

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
