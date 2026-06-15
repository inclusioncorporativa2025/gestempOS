const express = require('express');
const router = express.Router();
const { registrarNavegacion, listarAccesos, accederComoUsuario } = require('../controllers/platformController');
const { requireAuth, requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

router.post('/registrarNavegacion', requireAuth, registrarNavegacion);
router.get('/accesos', requireAuth, requireRole(ROLE_GROUPS.PLATFORM), listarAccesos);
router.post('/accederComoUsuario', requireAuth, requireRole(ROLE_GROUPS.PLATFORM), accederComoUsuario);

module.exports = router;
