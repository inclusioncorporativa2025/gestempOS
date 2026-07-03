#!/usr/bin/env node
/**
 * Prueba real del webhook Make → Google Sheets.
 *
 * Uso:
 *   node backend/scripts/send-make-lead-test.js
 *
 * Requiere en backend/.env:
 *   MAKE_LEAD_WEBHOOK_URL=https://hook.eu1.make.com/...
 *   MAKE_LEAD_WEBHOOK_API_KEY=tc_make_...
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { buildLeadPayload } = require('../utils/leadPayload');
const { sendLeadToMake, isConfigured } = require('../services/makeLeadService');

const buildTestLead = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const demoStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  demoStart.setMinutes(0, 0, 0);
  const demoEnd = new Date(demoStart.getTime() + 30 * 60 * 1000);

  return buildLeadPayload({
    fecha_registro: new Date().toISOString(),
    fecha_demo: demoStart.toISOString(),
    fecha_demo_legible: demoStart.toLocaleString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Madrid',
    }),
    fecha_demo_fin: demoEnd.toISOString(),
    demo_zona_horaria: 'Europe/Madrid',
    demo_enlace_cancelar: 'https://calendly.com/cancellations/ejemplo',
    demo_enlace_reagendar: 'https://calendly.com/reschedulings/ejemplo',
    nombre: 'Julia Prueba Real',
    email: `prueba.demo+${stamp}@timecor.es`,
    telefono: '+34600999888',
    empresa: 'Prueba Integración SL',
    cargo: 'Responsable RRHH',
    num_empleados: '11-50',
    interes: 'Demo Timecor - fichajes y prenómina',
    mensaje: 'Reserva de prueba real para validar flujo Make → Google Sheets.',
    origen: 'landing_timecor',
    evento: 'demo_solicitada',
    utm_source: 'test_manual',
    utm_medium: 'script',
    utm_campaign: 'validacion_make',
    estado_lead: 'prueba',
    consentimiento_rgpd: true,
    ip: '127.0.0.1',
    user_agent: 'gestempOS/send-make-lead-test',
    make_execution_id: '',
  });
};

const main = async () => {
  if (!isConfigured()) {
    console.error('Falta MAKE_LEAD_WEBHOOK_URL en backend/.env');
    process.exit(1);
  }

  const lead = buildTestLead();

  console.log('Enviando lead de prueba a Make...');
  console.log(JSON.stringify(lead, null, 2));

  try {
    const result = await sendLeadToMake(lead);
    console.log(`\nOK — Make respondió ${result.status}: ${result.body || 'Accepted'}`);
    console.log('\nRevisa Make → History (última ejecución).');
    console.log('Si el módulo Google Sheets tiene error rojo, ahí está la causa.');
    console.log('\nEn Google Sheets mapea UNA de estas opciones:');
    console.log('  A) Campo sheet_row → columna Values (array completo)');
    console.log('  B) Cada campo suelto: nombre, email, telefono…');
  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
};

main();
