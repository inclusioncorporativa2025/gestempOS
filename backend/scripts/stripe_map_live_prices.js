#!/usr/bin/env node
/**
 * Mapea productos/precios LIVE existentes en Stripe → SQL para tabla planes.
 *
 * Uso (desde raíz del repo):
 *   export STRIPE_API_KEY=sk_live_...
 *   node backend/scripts/stripe_map_live_prices.js
 *
 * Requiere: npm install en backend/ (paquete stripe)
 */

const path = require('path');
const Stripe = require('stripe');

const apiKey = process.env.STRIPE_API_KEY;
if (!apiKey) {
  console.error('ERROR: export STRIPE_API_KEY=sk_live_...');
  process.exit(1);
}
if (!apiKey.startsWith('sk_live_')) {
  console.error('ERROR: usa clave LIVE (sk_live_...), no test.');
  process.exit(1);
}

const stripe = new Stripe(apiKey);

const PLANES = [
  {
    codigo: 'esencial',
    mes: 'Timecor_Esencial_Mes',
    anual: 'Timecor_Esencial_anual',
    esperadoMes: 250,
    esperadoAnual: 3000,
  },
  {
    codigo: 'rrhh',
    mes: 'Timecor_RRHH_Mes',
    anual: 'Timecor_RRHH_anual',
    esperadoMes: 390,
    esperadoAnual: 4680,
  },
  {
    codigo: 'completo',
    mes: 'Timecor_Completo_Mes',
    anual: 'Timecor_Completo_anual',
    esperadoMes: 590,
    esperadoAnual: 7080,
  },
];

const findProduct = (products, name) =>
  products.find((p) => p.name.toLowerCase() === name.toLowerCase());

const resolvePrice = (product, prices, interval, esperadoCents) => {
  const defaultId =
    typeof product.default_price === 'string'
      ? product.default_price
      : product.default_price?.id;

  const activos = prices.data.filter(
    (p) => p.active && p.recurring && p.recurring.interval === interval,
  );

  if (activos.length === 0) return null;

  if (defaultId) {
    const porDefault = activos.find((p) => p.id === defaultId);
    if (porDefault) return porDefault;
  }

  const porImporte = activos.find((p) => p.unit_amount === esperadoCents);
  if (porImporte) return porImporte;

  if (activos.length > 1) {
    console.warn(
      `  AVISO: ${product.name} tiene ${activos.length} precios ${interval};`
      + ` usando el primero. Revisa en Dashboard.`,
    );
  }

  return activos[0];
};

const formatEur = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

async function main() {
  const { data: products } = await stripe.products.list({ limit: 100, active: true });

  console.log('==> Productos Timecor en LIVE:\n');
  products
    .filter((p) => /timecor/i.test(p.name))
    .forEach((p) => {
      console.log(`  ${p.name}\t${p.id}\tdefault=${p.default_price || '-'}`);
    });

  console.log('\n==> Mapeando a planes...\n');

  const result = {};

  for (const plan of PLANES) {
    const prodMes = findProduct(products, plan.mes);
    const prodAnual = findProduct(products, plan.anual);

    if (!prodMes) {
      console.error(`ERROR: no encontrado: ${plan.mes}`);
      process.exit(1);
    }
    if (!prodAnual) {
      console.error(`ERROR: no encontrado: ${plan.anual}`);
      process.exit(1);
    }

    const pricesMes = await stripe.prices.list({ product: prodMes.id, active: true, limit: 20 });
    const pricesAnual = await stripe.prices.list({ product: prodAnual.id, active: true, limit: 20 });

    const priceMes = resolvePrice(prodMes, pricesMes, 'month', plan.esperadoMes);
    const priceAnual = resolvePrice(prodAnual, pricesAnual, 'year', plan.esperadoAnual);

    if (!priceMes) {
      console.error(`ERROR: sin precio mensual en ${plan.mes} (${prodMes.id})`);
      process.exit(1);
    }
    if (!priceAnual) {
      console.error(`ERROR: sin precio anual en ${plan.anual} (${prodAnual.id})`);
      process.exit(1);
    }

    if (priceMes.unit_amount !== plan.esperadoMes) {
      console.warn(
        `  AVISO: ${plan.mes} = ${formatEur(priceMes.unit_amount)}/mes`
        + ` (esperado ${formatEur(plan.esperadoMes)})`,
      );
    }
    if (priceAnual.unit_amount !== plan.esperadoAnual) {
      console.warn(
        `  AVISO: ${plan.anual} = ${formatEur(priceAnual.unit_amount)}/año`
        + ` (esperado ${formatEur(plan.esperadoAnual)})`,
      );
    }

    result[plan.codigo] = { mensual: priceMes.id, anual: priceAnual.id };

    console.log(`  ${plan.codigo}:`);
    console.log(`    ${plan.mes}: ${priceMes.id} (${formatEur(priceMes.unit_amount)}/mes)`);
    console.log(`    ${plan.anual}: ${priceAnual.id} (${formatEur(priceAnual.unit_amount)}/año)`);
    console.log('');
  }

  const { esencial, rrhh, completo } = result;

  console.log('==============================================================================');
  console.log('SQL para MySQL (prod):');
  console.log('==============================================================================\n');
  console.log(`UPDATE planes SET
  stripe_price_id_mensual = '${esencial.mensual}',
  stripe_price_id_anual   = '${esencial.anual}'
WHERE codigo = 'esencial';

UPDATE planes SET
  stripe_price_id_mensual = '${rrhh.mensual}',
  stripe_price_id_anual   = '${rrhh.anual}'
WHERE codigo = 'rrhh';

UPDATE planes SET
  stripe_price_id_mensual = '${completo.mensual}',
  stripe_price_id_anual   = '${completo.anual}'
WHERE codigo = 'completo';

SELECT codigo, stripe_price_id_mensual, stripe_price_id_anual FROM planes;
`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
