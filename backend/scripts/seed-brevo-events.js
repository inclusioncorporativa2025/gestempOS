#!/usr/bin/env node
/**
 * Registra todos los eventos TIME_* en Brevo para que aparezcan
 * como triggers en Automatizaciones.
 *
 * Uso:
 *   node backend/scripts/seed-brevo-events.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const {
  TIME_EVENTS,
  isConfigured,
  upsertContact,
  trackEvent,
} = require('../services/brevoLeadService');
const { buildLeadPayload } = require('../utils/leadPayload');

const SEED_EMAIL = 'timecor.eventos.seed@timecor.es';

const ALL_EVENTS = [
  {
    name: TIME_EVENTS.DEMO_SOLICITADA,
    properties: {
      origen: 'seed_script',
      estado_lead: 'nuevo',
    },
  },
  {
    name: TIME_EVENTS.LEAD_CONTACTADO,
    properties: {
      estado_anterior: 'nuevo',
      estado_nuevo: 'contactado',
    },
  },
  {
    name: TIME_EVENTS.DEMO_REALIZADA,
    properties: {
      estado_anterior: 'contactado',
      estado_nuevo: 'demo realizada',
    },
  },
  {
    name: TIME_EVENTS.LEAD_SE_LO_VA_PENSAR,
    properties: {
      estado_anterior: 'demo realizada',
      estado_nuevo: 'se lo va pensar',
    },
  },
  {
    name: TIME_EVENTS.LEAD_CONTRATADO,
    properties: {
      estado_anterior: 'se lo va pensar',
      estado_nuevo: 'contratado',
    },
  },
  {
    name: TIME_EVENTS.LEAD_PERDIDO,
    properties: {
      estado_anterior: 'demo realizada',
      estado_nuevo: 'perdido',
    },
  },
  {
    name: TIME_EVENTS.LEAD_NO_SHOW,
    properties: {
      estado_anterior: 'contactado',
      estado_nuevo: 'no show',
    },
  },
];

const main = async () => {
  if (!isConfigured()) {
    console.error('Falta BREVO_API / BREVO_API_KEY en backend/.env');
    process.exit(1);
  }

  const lead = buildLeadPayload({
    fecha_registro: new Date().toISOString(),
    fecha_demo: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    hora_demo: '11:00',
    nombre: 'Timecor Eventos Seed',
    email: SEED_EMAIL,
    telefono: '+34600000001',
    empresa: 'Seed interno',
    num_empleados: '1',
    consentimiento_rgpd: true,
  });

  console.log('Creando contacto seed en Brevo...');
  await upsertContact(lead, {
    nombre: 'Timecor',
    apellidos: 'Eventos Seed',
    rawLead: { fecha_demo: lead.fecha_demo, fecha_registro: new Date().toISOString(), hora_demo: '11:00' },
  });

  console.log(`\nRegistrando ${ALL_EVENTS.length} eventos TIME_*...\n`);

  for (const event of ALL_EVENTS) {
    try {
      await trackEvent(event.name, SEED_EMAIL, event.properties);
      console.log(`  OK  ${event.name}`);
    } catch (error) {
      console.error(`  ERR ${event.name}: ${error.message}`);
    }
  }

  console.log('\nListo. En Brevo → Automatizaciones ya deberían aparecer todos los eventos.');
  console.log('Contacto seed (puedes borrarlo):', SEED_EMAIL);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
