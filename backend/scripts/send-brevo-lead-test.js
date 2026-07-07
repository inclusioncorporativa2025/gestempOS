#!/usr/bin/env node
/**
 * Prueba Brevo: contacto TIME_LEADS + evento time_demo_solicitada.
 *
 * Uso:
 *   node backend/scripts/send-brevo-lead-test.js
 *
 * Requiere en backend/.env:
 *   BREVO_API_KEY=xkeysib-...
 *   BREVO_LIST_ID=9
 *   BREVO_ENABLED=true
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { buildLeadPayload } = require('../utils/leadPayload');
const { mapDemoFormToLead } = require('../utils/demoFormMapper');
const { syncDemoLeadToBrevo, isConfigured, TIME_EVENTS } = require('../services/brevoLeadService');

const buildTestContext = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const demoStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  demoStart.setMinutes(0, 0, 0);

  const rawLead = mapDemoFormToLead({
    nombre: 'Julia',
    apellidos: 'Prueba Brevo',
    email: `prueba.brevo+${stamp}@timecor.es`,
    telefono: `+34600${String(Date.now()).slice(-6)}`,
    tipo_negocio: 'Empresa con empleados',
    num_empleados: '6-20',
    fecha_demo: demoStart.toISOString().split('T')[0],
    hora_demo: '11:00',
    consentimiento_rgpd: true,
    utm: {
      utm_source: 'test_script',
      utm_medium: 'cli',
      utm_campaign: 'brevo_integration',
    },
  });

  return {
    lead: buildLeadPayload(rawLead),
    context: {
      nombre: 'Julia',
      apellidos: 'Prueba Brevo',
      utm: {
        utm_source: 'test_script',
        utm_medium: 'cli',
        utm_campaign: 'brevo_integration',
      },
      rawLead,
    },
  };
};

const main = async () => {
  if (!isConfigured()) {
    console.error('Falta BREVO_API_KEY o BREVO_ENABLED=false en backend/.env');
    process.exit(1);
  }

  const { lead, context } = buildTestContext();

  console.log('Enviando lead de prueba a Brevo...');
  console.log(JSON.stringify({ lead, context: { ...context, rawLead: undefined } }, null, 2));

  try {
    const result = await syncDemoLeadToBrevo(lead, context);
    console.log(`\nOK — Contacto upsert + evento ${TIME_EVENTS.DEMO_SOLICITADA}`);
    console.log(JSON.stringify(result, null, 2));
    console.log('\nRevisa en Brevo → Contactos (lista TIME_LEADS) y eventos del contacto.');
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
};

main();
