const express = require('express');
const { registrarDemoLead } = require('../controllers/landingLeadController');

const router = express.Router();

router.post('/demo-lead', registrarDemoLead);

module.exports = router;
