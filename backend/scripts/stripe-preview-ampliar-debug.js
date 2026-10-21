/**
 * Prueba preview Stripe ampliar plazas (legacy) en servidor.
 * Uso:
 *   node scripts/stripe-preview-ampliar-debug.js --id-empresa 76 --licencias 7
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { previewCambiarPlanStripe } = require('../services/billingService');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const out = { idEmpresa: null, plan: 'esencial', licencias: null };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--id-empresa') out.idEmpresa = Number(args[++i]);
    else if (args[i] === '--plan') out.plan = args[++i];
    else if (args[i] === '--licencias') out.licencias = Number(args[++i]);
  }
  return out;
};

const main = async () => {
  const { idEmpresa, plan, licencias } = parseArgs();
  if (!idEmpresa || !licencias) {
    console.error('Uso: node scripts/stripe-preview-ampliar-debug.js --id-empresa 76 --licencias 7');
    process.exit(1);
  }

  const preview = await previewCambiarPlanStripe(idEmpresa, { plan, licencias });
  console.log(JSON.stringify(preview, null, 2));
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
