#!/usr/bin/env node
/**
 * Consulta gasto WhatsApp (Meta pricing_analytics) desde CLI.
 *
 * Uso:
 *   node scripts/whatsapp-meta-gasto.js
 *   node scripts/whatsapp-meta-gasto.js --from=2026-10-01 --to=2026-10-31
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getWhatsappMetaGasto } = require('../services/whatsappMetaAnalyticsService');

const args = process.argv.slice(2);
const fromArg = args.find((a) => a.startsWith('--from='));
const toArg = args.find((a) => a.startsWith('--to='));

const from = fromArg ? fromArg.split('=')[1] : undefined;
const to = toArg ? toArg.split('=')[1] : undefined;

getWhatsappMetaGasto({ from, to })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error(error.message || error);
    if (error.details) console.error(JSON.stringify(error.details, null, 2));
    process.exit(1);
  });
