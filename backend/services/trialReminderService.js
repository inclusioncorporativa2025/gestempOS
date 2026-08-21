const { sequelize } = require('../config/db');
const { APP_URL } = require('../config/appUrls');
const { TRIAL_WARN_DAYS } = require('../config/trial');
const { enviarAvisoFinPrueba } = require('../utils/mailService');

const TRIAL_AVISO_TIPO = 'trial_3_dias';

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

const listarEmpresasPruebaEnDias = async (dias = TRIAL_WARN_DAYS) => {
  return sequelize.query(
    `SELECT
       e.id_empresa,
       e.nombre,
       ef.trial_ends_at,
       ef.modo_facturacion,
       ef.estado_suscripcion,
       ef.stripe_subscription_id,
       DATEDIFF(DATE(ef.trial_ends_at), CURDATE()) AS dias_hasta_fin
     FROM m_empresas e
     INNER JOIN empresa_facturacion ef ON ef.id_empresa = e.id_empresa
     WHERE e.fecha_baja IS NULL
       AND IFNULL(e.activo, 1) = 1
       AND ef.trial_ends_at IS NOT NULL
       AND ef.trial_ends_at > NOW()
       AND DATEDIFF(DATE(ef.trial_ends_at), CURDATE()) <= :dias
       AND DATEDIFF(DATE(ef.trial_ends_at), CURDATE()) >= 0
       AND (
         LOWER(IFNULL(ef.modo_facturacion, '')) = 'trial'
         OR LOWER(IFNULL(ef.estado_suscripcion, '')) = 'trialing'
       )
       AND LOWER(IFNULL(ef.estado_suscripcion, '')) NOT IN ('active', 'past_due', 'canceled')
       AND NOT EXISTS (
         SELECT 1 FROM empresa_renovacion_aviso a
         WHERE a.id_empresa = e.id_empresa
           AND a.period_end = DATE(ef.trial_ends_at)
           AND a.tipo = :tipoAviso
       )
     ORDER BY e.id_empresa`,
    {
      replacements: { dias, tipoAviso: TRIAL_AVISO_TIPO },
      type: sequelize.QueryTypes.SELECT,
    },
  );
};

const registrarAvisoFinPrueba = async (idEmpresa, trialEndsAt, emailDestino) => {
  const periodEnd = trialEndsAt instanceof Date
    ? trialEndsAt.toISOString().slice(0, 10)
    : String(trialEndsAt).slice(0, 10);

  await sequelize.query(
    `INSERT INTO empresa_renovacion_aviso (id_empresa, period_end, tipo, email_destino)
     VALUES (:idEmpresa, :periodEnd, :tipo, :email)
     ON DUPLICATE KEY UPDATE email_destino = VALUES(email_destino), enviado_en = NOW()`,
    {
      replacements: {
        idEmpresa,
        periodEnd,
        tipo: TRIAL_AVISO_TIPO,
        email: emailDestino ?? null,
      },
    },
  );
};

const enviarAvisosFinPrueba = async ({ dias = TRIAL_WARN_DAYS, dryRun = false } = {}) => {
  const candidatas = await listarEmpresasPruebaEnDias(dias);
  const resultados = [];
  const enlaceFacturacion = `${APP_URL}/facturacion`;

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

    const enStripeTrialing = Boolean(
      row.stripe_subscription_id
      && String(row.estado_suscripcion || '').toLowerCase() === 'trialing',
    );

    if (!dryRun) {
      const diasRestantes = Math.max(
        0,
        Number(row.dias_hasta_fin ?? dias),
      );

      await enviarAvisoFinPrueba({
        nombre: admin.nombre,
        email: admin.email,
        nombreEmpresa: row.nombre,
        diasRestantes,
        fechaFinLabel: formatFechaEs(row.trial_ends_at),
        enlaceFacturacion,
        enStripeTrialing,
      });

      await registrarAvisoFinPrueba(row.id_empresa, row.trial_ends_at, admin.email);
    }

    resultados.push({
      id_empresa: row.id_empresa,
      nombre: row.nombre,
      email: admin.email,
      trial_ends_at: row.trial_ends_at,
      dias_hasta_fin: row.dias_hasta_fin,
      enviado: !dryRun,
      dry_run: dryRun,
    });
  }

  return {
    dias,
    dry_run: dryRun,
    total: candidatas.length,
    enviados: resultados.filter((r) => r.enviado).length,
    resultados,
  };
};

module.exports = {
  TRIAL_AVISO_TIPO,
  listarEmpresasPruebaEnDias,
  enviarAvisosFinPrueba,
};
