#!/usr/bin/env node
/**
 * Cron / prueba manual — alertas de fichaje (marketplace alertas_fichaje).
 *
 * Uso:
 *   cd backend && node scripts/run-alertas-fichaje.js
 *   node scripts/run-alertas-fichaje.js --dry-run
 *   node scripts/run-alertas-fichaje.js --id-empresa=105
 *   node scripts/run-alertas-fichaje.js --id-empresa=105 --hora=10:30
 *   node scripts/run-alertas-fichaje.js --fecha=2026-03-22 --hora=09:20
 *
 * Cron en VPS: ver docs/marketplace-alertas.md (línea crontab; no incluir aquí por sintaxis del comentario).
 *
 * Requiere SMTP para email; WhatsApp opcional (Meta/OpenWA).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectToDatabase } = require('../config/db');
const { ejecutarAlertasFichaje } = require('../services/alertasFichajeService');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const idEmpresaArg = args.find((a) => a.startsWith('--id-empresa='));
const fechaArg = args.find((a) => a.startsWith('--fecha='));
const horaArg = args.find((a) => a.startsWith('--hora='));

const idEmpresa = idEmpresaArg ? Number(idEmpresaArg.split('=')[1]) : null;
const fecha = fechaArg ? fechaArg.split('=')[1] : null;
const horaReferencia = horaArg ? horaArg.split('=')[1] : null;

const main = async () => {
  await connectToDatabase();
  const resultado = await ejecutarAlertasFichaje({
    idEmpresa: Number.isFinite(idEmpresa) && idEmpresa > 0 ? idEmpresa : null,
    fecha,
    horaReferencia,
    dryRun,
  });
  console.log(JSON.stringify(resultado, null, 2));
  process.exit(0);
};

main().catch((error) => {
  console.error('run-alertas-fichaje:', error);
  process.exit(1);
});
