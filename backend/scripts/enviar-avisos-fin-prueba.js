#!/usr/bin/env node
/**
 * Envía emails de aviso de fin de prueba TRIAL_WARN_DAYS días antes de trial_ends_at.
 *
 * Uso:
 *   node backend/scripts/enviar-avisos-fin-prueba.js
 *   cd backend && node scripts/enviar-avisos-fin-prueba.js
 *   node backend/scripts/enviar-avisos-fin-prueba.js --dry-run
 *   node backend/scripts/enviar-avisos-fin-prueba.js --dias=3
 *
 * Cron diario (prod, 08:30):
 *   30 8 * * * cd /ruta/gestempOS/backend && node scripts/enviar-avisos-fin-prueba.js >> /var/log/timecor-trial-aviso.log 2>&1
 *
 * Requiere tabla empresa_renovacion_aviso (ver config/scripts/empresa_renovacion.sql).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectToDatabase } = require('../config/db');
const { TRIAL_WARN_DAYS } = require('../config/trial');
const { enviarAvisosFinPrueba } = require('../services/trialReminderService');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const diasArg = args.find((a) => a.startsWith('--dias='));
const dias = diasArg ? Number(diasArg.split('=')[1]) : TRIAL_WARN_DAYS;

const main = async () => {
  await connectToDatabase();
  const resultado = await enviarAvisosFinPrueba({ dias, dryRun });
  console.log(JSON.stringify(resultado, null, 2));
  process.exit(0);
};

main().catch((error) => {
  console.error('enviar-avisos-fin-prueba:', error);
  process.exit(1);
});
