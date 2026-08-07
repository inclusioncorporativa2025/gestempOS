#!/usr/bin/env node
/**
 * Simula webhook Meta → menú WhatsApp al móvil vinculado en BD.
 *
 * Uso (VPS, con backend en marcha):
 *   node scripts/whatsapp-webhook-test.js
 *   node scripts/whatsapp-webhook-test.js --from 34633326622 --body hola
 *   node scripts/whatsapp-webhook-test.js --url http://127.0.0.1:5001/api/whatsapp/webhook
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const crypto = require('crypto');

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const from = getArg('--from', '34633326622');
const body = getArg('--body', 'hola');
const url = getArg('--url', `http://127.0.0.1:${process.env.PORT || 5001}/api/whatsapp/webhook`);

const secret = process.env.WHATSAPP_APP_SECRET || '';
if (!secret) {
  console.error('Falta WHATSAPP_APP_SECRET en backend/.env');
  process.exit(1);
}

const payload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          field: 'messages',
          value: {
            messages: [
              {
                from,
                id: `test-${Date.now()}`,
                type: 'text',
                text: { body },
              },
            ],
          },
        },
      ],
    },
  ],
};

const rawBody = JSON.stringify(payload);
const signature = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;

const main = async () => {
  console.log('POST', url);
  console.log('From:', from, '| Body:', body);
  console.log('Secret chars:', secret.length);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': signature,
    },
    body: rawBody,
  });

  const text = await response.text();
  console.log('HTTP', response.status, text || '(vacío)');

  if (response.status === 401) {
    console.error('\nFirma rechazada → revisa WHATSAPP_APP_SECRET (App TIMECOR → Básica → Clave secreta)');
  } else if (response.status === 200) {
    console.log('\nOK. Revisa WhatsApp del móvil', from);
  }

  process.exit(response.ok ? 0 : 1);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
