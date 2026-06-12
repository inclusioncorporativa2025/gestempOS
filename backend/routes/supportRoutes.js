const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { enviarMensajeSoporte } = require('../controllers/supportController');

router.post('/contact', requireAuth, enviarMensajeSoporte);

module.exports = router;
