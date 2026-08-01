#!/usr/bin/env node
/**
 * Llamadas de prueba a Graph API para completar requisitos Meta App Review.
 *
 * Uso (en el VPS, con .env de producción):
 *   node scripts/meta-graph-test-calls.js
 *
 * Requiere:
 *   WHATSAPP_CLOUD_TOKEN
 *   WHATSAPP_BUSINESS_ACCOUNT_ID
 *   WHATSAPP_GRAPH_VERSION (opcional, default v22.0)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const token = process.env.WHATSAPP_CLOUD_TOKEN || '';
const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
const version = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';

const graphGet = async (path, label) => {
  const url = `https://graph.facebook.com/${version}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  console.log(`\n--- ${label} ---`);
  console.log(`GET ${path}`);
  console.log(`HTTP ${response.status}`);

  if (!response.ok) {
    console.error('Error:', data?.error?.message || JSON.stringify(data));
    return false;
  }

  console.log('OK:', JSON.stringify(data, null, 2).slice(0, 800));
  return true;
};

const main = async () => {
  if (!token) {
    console.error('Falta WHATSAPP_CLOUD_TOKEN en backend/.env');
    process.exit(1);
  }

  if (!wabaId) {
    console.error('Falta WHATSAPP_BUSINESS_ACCOUNT_ID en backend/.env');
    process.exit(1);
  }

  const results = [];

  results.push(await graphGet(
    `/${wabaId}/phone_numbers`,
    'whatsapp_business_management',
  ));

  results.push(await graphGet(
    '/me/businesses',
    'business_management',
  ));

  const ok = results.filter(Boolean).length;
  console.log(`\nCompletadas: ${ok}/${results.length}`);
  process.exit(ok === results.length ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
