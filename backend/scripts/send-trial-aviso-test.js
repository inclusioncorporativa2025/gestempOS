#!/usr/bin/env node
/**
 * Envía un correo de prueba del aviso de fin de periodo de prueba.
 *
 * Uso (desde backend/ o con ruta completa):
 *   node scripts/send-trial-aviso-test.js tu@correo.com
 *   node scripts/send-trial-aviso-test.js tu@correo.com --id-empresa=130
 *   node scripts/send-trial-aviso-test.js tu@correo.com --stripe
 *
 * Requiere SMTP configurado en backend/.env (SMTP_HOST, SMTP_USER, SMTP_PASS).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectToDatabase } = require('../config/db');
const { APP_URL } = require('../config/appUrls');
const { TRIAL_WARN_DAYS } = require('../config/trial');
const { enviarAvisoFinPrueba } = require('../utils/mailService');
const Empresa = require('../models/Empresa');
const { sequelize } = require('../config/db');

const args = process.argv.slice(2);
const emailDestino = args.find((a) => a.includes('@'));
const idEmpresaArg = args.find((a) => a.startsWith('--id-empresa='));
const simularStripe = args.includes('--stripe');

if (!emailDestino) {
  console.error('Uso: node scripts/send-trial-aviso-test.js tu@correo.com [--id-empresa=ID] [--stripe]');
  process.exit(1);
}

const formatFechaEs = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const obtenerAdminEmpresa = async (idEmpresa) => {
  const rows = await sequelize.query(
    `SELECT u.nombre, u.email
     FROM m_usuarios u
     INNER JOIN m_usuarios_empresas ue ON ue.id_usuario = u.id_usuario
     WHERE ue.id_empresa = :idEmpresa AND ue.tipo_usuario = 3 AND ue.fecha_baja IS NULL
     ORDER BY ue.fecha_alta ASC LIMIT 1`,
    { replacements: { idEmpresa }, type: sequelize.QueryTypes.SELECT },
  );
  return rows[0] ?? null;
};

const main = async () => {
  await connectToDatabase();

  const finPrueba = new Date();
  finPrueba.setDate(finPrueba.getDate() + TRIAL_WARN_DAYS);

  let nombre = 'Administrador';
  let nombreEmpresa = 'Empresa de prueba S.L.';
  let enStripeTrialing = simularStripe;

  if (idEmpresaArg) {
    const idEmpresa = Number(idEmpresaArg.split('=')[1]);
    const empresa = await Empresa.findByPk(idEmpresa);
    if (!empresa) {
      console.error(`Empresa ${idEmpresa} no encontrada`);
      process.exit(1);
    }
    nombreEmpresa = empresa.nombre;

    const admin = await obtenerAdminEmpresa(idEmpresa);
    if (admin?.nombre) nombre = admin.nombre;

    const [facturacion] = await sequelize.query(
      `SELECT trial_ends_at, stripe_subscription_id, estado_suscripcion
       FROM empresa_facturacion WHERE id_empresa = :idEmpresa LIMIT 1`,
      { replacements: { idEmpresa }, type: sequelize.QueryTypes.SELECT },
    );
    if (facturacion?.trial_ends_at) {
      finPrueba.setTime(new Date(facturacion.trial_ends_at).getTime());
    }
    if (!simularStripe && facturacion) {
      enStripeTrialing = Boolean(
        facturacion.stripe_subscription_id
        && String(facturacion.estado_suscripcion || '').toLowerCase() === 'trialing',
      );
    }
  }

  console.log(`Enviando prueba a: ${emailDestino}`);
  console.log(`Empresa: ${nombreEmpresa} | Fin prueba: ${formatFechaEs(finPrueba)} | Stripe: ${enStripeTrialing}`);

  await enviarAvisoFinPrueba({
    nombre,
    email: emailDestino,
    nombreEmpresa,
    diasRestantes: TRIAL_WARN_DAYS,
    fechaFinLabel: formatFechaEs(finPrueba),
    enlaceFacturacion: `${APP_URL}/facturacion`,
    enStripeTrialing,
  });

  console.log('Correo enviado correctamente.');
  process.exit(0);
};

main().catch((error) => {
  console.error('send-trial-aviso-test:', error.message || error);
  process.exit(1);
});
