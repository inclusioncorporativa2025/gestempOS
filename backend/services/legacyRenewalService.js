const crypto = require('crypto');
const { sequelize } = require('../config/db');
const Empresa = require('../models/Empresa');
const { APP_URL } = require('../config/appUrls');
const {
  normalizePlanId,
  getPlanMinLicencias,
  getPlanLabel,
  PLAN_CATALOG,
  ANNUAL_DISCOUNT_LABEL,
} = require('../config/plans');
const {
  diasRestantesPeriodo,
  duracionPeriodoDias,
} = require('../utils/legacyBillingPeriod');
const { obtenerDisponibilidadLicencias } = require('../repositorios/usuariosEmpresasRepository');
const {
  crearCheckoutSession,
  obtenerFacturacionCompleta,
} = require('./billingService');
const { enviarAvisoRenovacionLegacy } = require('../utils/mailService');

const RENEWAL_TOKEN_TTL_DAYS = Number(process.env.RENEWAL_TOKEN_TTL_DAYS) || 45;
const RENEWAL_NOTICE_DAYS = Number(process.env.RENEWAL_NOTICE_DAYS) || 7;

const hashToken = (raw) =>
  crypto.createHash('sha256').update(raw).digest('hex');

const formatFechaEs = (value) => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const parsePrecioAnual = (planId) => {
  const plan = PLAN_CATALOG.find((p) => p.id === normalizePlanId(planId));
  if (!plan) return 25;
  return parseFloat(String(plan.priceAnnual).replace(',', '.')) || 25;
};

const calcularProrrateoLicencia = ({
  planId = 'esencial',
  periodStart,
  periodEnd,
  referencia = new Date(),
} = {}) => {
  const precioAnual = parsePrecioAnual(planId);
  const diasRestantes = diasRestantesPeriodo(periodEnd, referencia);
  const diasTotal = duracionPeriodoDias(periodStart, periodEnd);
  if (!diasRestantes || !diasTotal) return 0;
  return Math.round((precioAnual * diasRestantes / diasTotal) * 100) / 100;
};

const obtenerAdminEmpresa = async (idEmpresa) => {
  const rows = await sequelize.query(
    `SELECT u.id_usuario, u.email, u.nombre
     FROM m_usuarios u
     INNER JOIN m_usuarios_empresas ue ON ue.id_usuario = u.id_usuario
     WHERE ue.id_empresa = :idEmpresa
       AND ue.tipo_usuario = 3
       AND ue.fecha_baja IS NULL
       AND IFNULL(ue.activo, 1) = 1
       AND IFNULL(u.activo, 1) = 1
     ORDER BY ue.fecha_alta ASC
     LIMIT 1`,
    {
      replacements: { idEmpresa },
      type: sequelize.QueryTypes.SELECT,
    },
  );
  return rows[0] ?? null;
};

const crearTokenRenovacion = async (idEmpresa, periodEnd) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiraEn = new Date(Date.now() + RENEWAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const periodEndDate = periodEnd instanceof Date
    ? periodEnd.toISOString().slice(0, 10)
    : String(periodEnd).slice(0, 10);

  await sequelize.query(
    `INSERT INTO empresa_renovacion_token (id_empresa, token_hash, period_end, expira_en)
     VALUES (:idEmpresa, :tokenHash, :periodEnd, :expiraEn)`,
    {
      replacements: {
        idEmpresa,
        tokenHash,
        periodEnd: periodEndDate,
        expiraEn,
      },
    },
  );

  return { rawToken, expiraEn, enlaceRenovacion: `${APP_URL}/renovar?token=${rawToken}` };
};

const resolverTokenRenovacion = async (rawToken) => {
  if (!rawToken) {
    const error = new Error('Token de renovación no válido');
    error.status = 400;
    error.code = 'RENEWAL_TOKEN_INVALID';
    throw error;
  }

  const tokenHash = hashToken(rawToken);
  const rows = await sequelize.query(
    `SELECT t.id_empresa, t.period_end, t.expira_en
     FROM empresa_renovacion_token t
     WHERE t.token_hash = :tokenHash
     LIMIT 1`,
    {
      replacements: { tokenHash },
      type: sequelize.QueryTypes.SELECT,
    },
  );

  const row = rows[0];
  if (!row) {
    const error = new Error('Enlace de renovación no válido o caducado');
    error.status = 404;
    error.code = 'RENEWAL_TOKEN_NOT_FOUND';
    throw error;
  }

  if (new Date(row.expira_en).getTime() < Date.now()) {
    const error = new Error('El enlace de renovación ha caducado');
    error.status = 410;
    error.code = 'RENEWAL_TOKEN_EXPIRED';
    throw error;
  }

  const facturacion = await obtenerFacturacionCompleta(row.id_empresa);
  if (facturacion?.stripe_subscription_id) {
    const error = new Error('Esta empresa ya tiene una suscripción activa en Stripe');
    error.status = 400;
    error.code = 'RENEWAL_ALREADY_STRIPE';
    throw error;
  }

  return { idEmpresa: row.id_empresa, periodEnd: row.period_end };
};

const obtenerInfoRenovacion = async (rawToken) => {
  const { idEmpresa } = await resolverTokenRenovacion(rawToken);
  const empresa = await Empresa.findByPk(idEmpresa);
  const facturacion = await obtenerFacturacionCompleta(idEmpresa);
  const disponibilidad = await obtenerDisponibilidadLicencias(idEmpresa);
  const planActual = normalizePlanId(empresa?.plan);

  const licenciasSugeridas = Math.max(
    Number(empresa?.licencias) || 0,
    disponibilidad.usadas,
    getPlanMinLicencias(planActual),
  );

  return {
    empresa: {
      id_empresa: idEmpresa,
      nombre: empresa?.nombre ?? '',
      plan_actual: planActual,
      plan_actual_label: getPlanLabel(planActual),
    },
    licencias: licenciasSugeridas,
    licencias_usadas: disponibilidad.usadas,
    period_end: facturacion?.current_period_end ?? null,
    period_end_label: formatFechaEs(facturacion?.current_period_end),
    dias_restantes: RENEWAL_NOTICE_DAYS,
    planes: PLAN_CATALOG.map((plan) => ({
      ...plan,
      min_licencias: plan.minLicencias,
    })),
    descuento_anual: ANNUAL_DISCOUNT_LABEL,
  };
};

const crearCheckoutRenovacionLegacy = async ({
  rawToken,
  planCodigo,
  ciclo,
  licencias,
}) => {
  const { idEmpresa } = await resolverTokenRenovacion(rawToken);
  const empresa = await Empresa.findByPk(idEmpresa);
  if (!empresa) {
    const error = new Error('Empresa no encontrada');
    error.status = 404;
    throw error;
  }

  const admin = await obtenerAdminEmpresa(idEmpresa);
  if (!admin?.email) {
    const error = new Error('No se encontró el administrador de la empresa');
    error.status = 400;
    error.code = 'RENEWAL_NO_ADMIN';
    throw error;
  }

  const planId = normalizePlanId(planCodigo);
  const planDef = PLAN_CATALOG.find((p) => p.id === planId);
  if (!planDef?.available) {
    const error = new Error('El plan seleccionado no está disponible');
    error.status = 400;
    error.code = 'PLAN_NOT_AVAILABLE';
    throw error;
  }

  const disponibilidad = await obtenerDisponibilidadLicencias(idEmpresa);
  const minLicencias = getPlanMinLicencias(planId);
  let qty = licencias != null ? Number(licencias) : Number(empresa.licencias) || minLicencias;
  if (!Number.isFinite(qty)) qty = minLicencias;
  qty = Math.max(qty, minLicencias, disponibilidad.usadas);

  const cicloNormalizado = ciclo === 'anual' ? 'anual' : 'mensual';

  return crearCheckoutSession({
    idEmpresa,
    email: admin.email,
    nombre: admin.nombre,
    planCodigo: planId,
    ciclo: cicloNormalizado,
    licencias: qty,
    aplicarTrial: false,
  });
};

const listarLegacyRenovacionEnDias = async (dias = RENEWAL_NOTICE_DAYS) => {
  return sequelize.query(
    `SELECT
       e.id_empresa,
       e.nombre,
       e.licencias,
       e.plan,
       ef.current_period_start,
       ef.current_period_end,
       ef.modo_facturacion
     FROM m_empresas e
     INNER JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
     WHERE e.fecha_baja IS NULL
       AND ef.modo_facturacion = 'legacy'
       AND ef.stripe_subscription_id IS NULL
       AND ef.current_period_end IS NOT NULL
       AND DATE(ef.current_period_end) = DATE(DATE_ADD(CURDATE(), INTERVAL :dias DAY))
       AND NOT EXISTS (
         SELECT 1 FROM empresa_renovacion_aviso a
         WHERE a.id_empresa = e.id_empresa
           AND a.period_end = DATE(ef.current_period_end)
           AND a.tipo = '7_dias'
       )
     ORDER BY e.id_empresa`,
    {
      replacements: { dias },
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const registrarAvisoEnviado = async (idEmpresa, periodEnd, emailDestino) => {
  const periodEndDate = periodEnd instanceof Date
    ? periodEnd.toISOString().slice(0, 10)
    : String(periodEnd).slice(0, 10);

  await sequelize.query(
    `INSERT INTO empresa_renovacion_aviso (id_empresa, period_end, tipo, email_destino)
     VALUES (:idEmpresa, :periodEnd, '7_dias', :email)
     ON DUPLICATE KEY UPDATE email_destino = VALUES(email_destino), enviado_en = NOW()`,
    {
      replacements: {
        idEmpresa,
        periodEnd: periodEndDate,
        email: emailDestino ?? null,
      },
    },
  );
};

const enviarAvisosRenovacionLegacy = async ({ dias = RENEWAL_NOTICE_DAYS, dryRun = false } = {}) => {
  const candidatas = await listarLegacyRenovacionEnDias(dias);
  const resultados = [];

  for (const row of candidatas) {
    const admin = await obtenerAdminEmpresa(row.id_empresa);
    if (!admin?.email) {
      resultados.push({
        id_empresa: row.id_empresa,
        nombre: row.nombre,
        enviado: false,
        motivo: 'sin_admin_email',
      });
      continue;
    }

    const { rawToken, enlaceRenovacion } = await crearTokenRenovacion(
      row.id_empresa,
      row.current_period_end,
    );

    const enlacesPlanes = PLAN_CATALOG.map((plan) => ({
      id: plan.id,
      name: plan.name,
      available: plan.available,
      priceMonthly: plan.priceMonthly,
      priceAnnual: plan.priceAnnual,
      minLicencias: plan.minLicencias,
      mensual: `${APP_URL}/renovar?token=${rawToken}&plan=${plan.id}&ciclo=mensual`,
      anual: `${APP_URL}/renovar?token=${rawToken}&plan=${plan.id}&ciclo=anual`,
    }));

    if (!dryRun) {
      await enviarAvisoRenovacionLegacy({
        nombre: admin.nombre,
        email: admin.email,
        nombreEmpresa: row.nombre,
        licencias: row.licencias,
        periodEndLabel: formatFechaEs(row.current_period_end),
        enlaceRenovacion,
        enlacesPlanes,
        descuentoAnual: ANNUAL_DISCOUNT_LABEL,
      });

      await registrarAvisoEnviado(row.id_empresa, row.current_period_end, admin.email);
    }

    resultados.push({
      id_empresa: row.id_empresa,
      nombre: row.nombre,
      email: admin.email,
      enviado: !dryRun,
      dry_run: dryRun,
      enlaceRenovacion,
    });
  }

  return {
    dias_anticipacion: dias,
    total: candidatas.length,
    resultados,
  };
};

module.exports = {
  RENEWAL_NOTICE_DAYS,
  calcularProrrateoLicencia,
  obtenerInfoRenovacion,
  crearCheckoutRenovacionLegacy,
  enviarAvisosRenovacionLegacy,
  resolverTokenRenovacion,
};
