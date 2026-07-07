#!/usr/bin/env node
/**
 * Prueba real del webhook Make → Google Sheets.
 *
 * Uso:
 *   node backend/scripts/send-make-lead-test.js
 *
 * Requiere en backend/.env:
 *   MAKE_LEAD_WEBHOOK_URL=https://hook.eu1.make.com/...
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { buildLeadPayload } = require('../utils/leadPayload');
const { sendLeadToMake, isConfigured } = require('../services/makeLeadService');

const buildTestLead = () => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const demoStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  demoStart.setMinutes(0, 0, 0);

  return buildLeadPayload({
    fecha_registro: new Date().toISOString(),
    fecha_demo: demoStart.toISOString().split('T')[0],
    hora_demo: '11:00',
    demo_zona_horaria: 'Europe/Madrid',
    nombre: 'Julia Prueba Real',
    email: `prueba.demo+${stamp}@timecor.es`,
    telefono: '+34600999888',
    empresa: 'Empresa con empleados',
    num_empleados: '6-20',
    consentimiento_rgpd: true,
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
