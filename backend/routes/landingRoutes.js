const express = require('express');
const {
  landingStatus,
  registrarDemoLead,
  handleCalendlyWebhook,
} = require('../controllers/landingLeadController');
const { landingLimiter, webhookLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/status', landingStatus);
router.post('/demo-lead', landingLimiter, registrarDemoLead);
router.post('/calendly-webhook', webhookLimiter, handleCalendlyWebhook);

module.exports = router;
