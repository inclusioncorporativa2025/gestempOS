#!/usr/bin/env node
/**
 * Envía emails de renovación legacy 7 días antes de current_period_end.
 *
 * Uso (desde raíz del repo o desde backend/):
 *   node backend/scripts/enviar-avisos-renovacion-legacy.js
 *   cd backend && node scripts/enviar-avisos-renovacion-legacy.js
 *   node backend/scripts/enviar-avisos-renovacion-legacy.js --dry-run
 *
 * Cron diario (prod, 08:00):
 *   0 8 * * * cd /root/fichaeneltrabajo/gestempOS/backend && node scripts/enviar-avisos-renovacion-legacy.js >> /var/log/timecor-renovacion.log 2>&1
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectToDatabase } = require('../config/db');
const { enviarAvisosRenovacionLegacy } = require('../services/legacyRenewalService');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const diasArg = args.find((a) => a.startsWith('--dias='));
const dias = diasArg ? Number(diasArg.split('=')[1]) : undefined;

const main = async () => {
  await connectToDatabase();
  const resultado = await enviarAvisosRenovacionLegacy({ dias, dryRun });
  console.log(JSON.stringify(resultado, null, 2));
  process.exit(0);
};

main().catch((error) => {
  console.error('enviar-avisos-renovacion-legacy:', error);
  process.exit(1);
});
