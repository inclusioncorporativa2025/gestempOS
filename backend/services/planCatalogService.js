const Plan = require('../models/Plan');
const { normalizePlanId, DEFAULT_PLAN, DEFAULT_PLAN_ID } = require('../config/plans');

const CACHE_MS = 60_000;
let cache = null;
let cacheAt = 0;

const loadCatalog = async () => {
  if (cache && Date.now() - cacheAt < CACHE_MS) {
    return cache;
  }

  const rows = await Plan.findAll({
    where: { activo: true },
    order: [['id_plan', 'ASC']],
    raw: true,
  });

  const byId = new Map();
  const byCodigo = new Map();

  for (const row of rows) {
    byId.set(Number(row.id_plan), row);
    byCodigo.set(String(row.codigo).toLowerCase(), row);
  }

  cache = { byId, byCodigo, rows };
  cacheAt = Date.now();
  return cache;
};

const obtenerPlanPorId = async (idPlan) => {
  const id = Number(idPlan);
  if (!Number.isFinite(id) || id <= 0) {
    return obtenerPlanPorCodigo(DEFAULT_PLAN);
  }

  const { byId } = await loadCatalog();
  return byId.get(id) ?? (await obtenerPlanPorCodigo(DEFAULT_PLAN));
};

const obtenerPlanPorCodigo = async (codigo) => {
  const codigoNorm = normalizePlanId(codigo);
  const { byCodigo } = await loadCatalog();
  return byCodigo.get(codigoNorm) ?? byCodigo.get(DEFAULT_PLAN) ?? null;
};

/**
 * Resuelve un plan del catálogo a partir de id_plan (FK) o código (texto legacy).
 */
const resolverPlan = async ({ id_plan, plan, codigo } = {}) => {
  if (id_plan != null && Number(id_plan) > 0) {
    const porId = await obtenerPlanPorId(id_plan);
    if (porId) {
      return porId;
    }
  }

  return obtenerPlanPorCodigo(plan ?? codigo ?? DEFAULT_PLAN);
};

const camposPlanEmpresa = (planRow) => ({
  id_plan: Number(planRow.id_plan),
  plan: normalizePlanId(planRow.codigo),
});

const obtenerCodigoPlanEmpresa = async (empresa) => {
  if (!empresa) {
    return DEFAULT_PLAN;
  }

  if (empresa.id_plan) {
    const row = await obtenerPlanPorId(empresa.id_plan);
    if (row) {
      return normalizePlanId(row.codigo);
    }
  }

  return normalizePlanId(empresa.plan);
};

const invalidarCachePlanes = () => {
  cache = null;
  cacheAt = 0;
};

module.exports = {
  obtenerPlanPorId,
  obtenerPlanPorCodigo,
  resolverPlan,
  camposPlanEmpresa,
  obtenerCodigoPlanEmpresa,
  invalidarCachePlanes,
};
