const { sequelize } = require('../config/db');
const Empresa = require('../models/Empresa');
const { getStripe } = require('./billingService');

/** Tablas operativas con columna empresa_id */
const TABLAS_EMPRESA_ID = [
  'peticiones',
  'fichaje_registro_eventos',
  'descansos',
  'fichajes',
  'bolsa_horas_movimientos',
  'ausencias',
  'usuarios_vacaciones_movimientos',
  'usuarios_vacaciones_cupo',
  'documentos_nomina',
  'usuarios_retribucion',
  'usuario_jornada',
  'jornadas',
  'meses_cierre',
  'festivos_empresa',
];

/** Tablas maestras con columna id_empresa */
const TABLAS_ID_EMPRESA = [
  'stripe_webhook_events',
  'empresa_plan_historial',
  'empresa_facturacion',
  'm_accesos_plataforma',
  'm_usuarios_empresas',
  'm_configuracion_esquema',
];

const deleteByColumn = async (table, column, idEmpresa, transaction) => {
  try {
    const [, meta] = await sequelize.query(
      `DELETE FROM \`${table}\` WHERE \`${column}\` = :idEmpresa`,
      {
        replacements: { idEmpresa },
        transaction,
      },
    );
    return Number(meta?.affectedRows) || 0;
  } catch (error) {
    if (/doesn't exist|Unknown table/i.test(error.message)) {
      return 0;
    }
    throw error;
  }
};

const cancelarStripeSiExiste = async (idEmpresa) => {
  const rows = await sequelize.query(
    `SELECT stripe_subscription_id, stripe_customer_id
     FROM empresa_facturacion
     WHERE id_empresa = :idEmpresa
     LIMIT 1`,
    {
      replacements: { idEmpresa },
      type: sequelize.QueryTypes.SELECT,
    },
  );

  const facturacion = rows[0];
  if (!facturacion?.stripe_subscription_id) {
    return { cancelada: false };
  }

  try {
    await getStripe().subscriptions.cancel(facturacion.stripe_subscription_id);
    return { cancelada: true, subscriptionId: facturacion.stripe_subscription_id };
  } catch (error) {
    console.warn(
      `No se pudo cancelar suscripción Stripe de empresa ${idEmpresa}:`,
      error.message,
    );
    return { cancelada: false, error: error.message };
  }
};

const eliminarUsuariosExclusivos = async (idEmpresa, transaction) => {
  const [, meta] = await sequelize.query(
    `DELETE u FROM m_usuarios u
     INNER JOIN m_usuarios_empresas ue ON ue.id_usuario = u.id_usuario
     WHERE ue.id_empresa = :idEmpresa
       AND u.tipo_usuario NOT IN (1, 2)
       AND NOT EXISTS (
         SELECT 1 FROM m_usuarios_empresas ue2
         WHERE ue2.id_usuario = u.id_usuario
           AND ue2.id_empresa <> :idEmpresa
       )`,
    {
      replacements: { idEmpresa },
      transaction,
    },
  );

  return Number(meta?.affectedRows) || 0;
};

/**
 * Elimina permanentemente una empresa de prueba y sus datos.
 * Solo para uso ROOT / entornos controlados.
 */
const purgarEmpresaCompleta = async (idEmpresa) => {
  const empresa = await Empresa.findByPk(idEmpresa);
  if (!empresa) {
    const error = new Error('Empresa no encontrada');
    error.status = 404;
    throw error;
  }

  const stripe = await cancelarStripeSiExiste(idEmpresa);
  const resumen = { idEmpresa, tablas: {}, stripe, usuariosEliminados: 0 };

  await sequelize.transaction(async (transaction) => {
    for (const tabla of TABLAS_EMPRESA_ID) {
      resumen.tablas[tabla] = await deleteByColumn(tabla, 'empresa_id', idEmpresa, transaction);
    }

    for (const tabla of TABLAS_ID_EMPRESA) {
      resumen.tablas[tabla] = await deleteByColumn(tabla, 'id_empresa', idEmpresa, transaction);
    }

    resumen.usuariosEliminados = await eliminarUsuariosExclusivos(idEmpresa, transaction);

    const filasEmpresa = await deleteByColumn('m_empresas', 'id_empresa', idEmpresa, transaction);
    resumen.tablas.m_empresas = filasEmpresa;

    if (!filasEmpresa) {
      const error = new Error('No se pudo eliminar la empresa');
      error.status = 500;
      throw error;
    }
  });

  return {
    message: `Empresa "${empresa.nombre}" eliminada permanentemente`,
    identificador_fiscal: empresa.identificador_fiscal,
    ...resumen,
  };
};

module.exports = {
  purgarEmpresaCompleta,
};
