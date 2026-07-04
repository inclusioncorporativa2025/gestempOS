const express = require('express');
const {
  landingStatus,
  registrarDemoLead,
  handleCalendlyWebhook,
} = require('../controllers/landingLeadController');

const router = express.Router();

router.get('/status', landingStatus);
router.post('/demo-lead', registrarDemoLead);
router.post('/calendly-webhook', handleCalendlyWebhook);

module.exports = router;
