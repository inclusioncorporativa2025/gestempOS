/**
 * Planes comerciales (backend). Mantener alineado con frontend/src/constants/plans.js
 */

const PLAN_IDS = ['esencial', 'rrhh', 'completo'];

const DEFAULT_PLAN = 'esencial';
const DEFAULT_PLAN_ID = 1;

const PLAN_FEATURES = {
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

const PLAN_MIN_LICENCIAS = {
  esencial: 5,
  rrhh: 10,
  completo: 15,
};

const PLAN_LABELS = {
  esencial: 'Esencial',
  rrhh: 'RRHH',
  completo: 'Completo',
};

const normalizePlanId = (plan) => {
  const id = String(plan || DEFAULT_PLAN).toLowerCase().trim();
  return PLAN_IDS.includes(id) ? id : DEFAULT_PLAN;
};

const planIncluyeFeature = (planId, featureKey) =>
  (PLAN_FEATURES[featureKey] || []).includes(normalizePlanId(planId));

const getPlanMinLicencias = (planId) =>
  PLAN_MIN_LICENCIAS[normalizePlanId(planId)] ?? PLAN_MIN_LICENCIAS.esencial;

const getPlanLabel = (planId) =>
  PLAN_LABELS[normalizePlanId(planId)] ?? PLAN_LABELS.esencial;

module.exports = {
  PLAN_IDS,
  DEFAULT_PLAN,
  DEFAULT_PLAN_ID,
  PLAN_FEATURES,
  PLAN_MIN_LICENCIAS,
  PLAN_LABELS,
  normalizePlanId,
  planIncluyeFeature,
  getPlanMinLicencias,
  getPlanLabel,
};
