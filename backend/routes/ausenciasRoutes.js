const express = require('express');
const router = express.Router();
const {
  getAusenciasByIdUsuario,
  crearAusencia,
  getAusenciasCalendario,
} = require('../controllers/ausenciasController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

router.post('/getAusenciasByIdUsuario', requireRole(ROLE_GROUPS.FICHAJE), getAusenciasByIdUsuario);
router.post('/getAusenciasCalendario', requireRole(ROLE_GROUPS.CALENDARIO_VIEW), getAusenciasCalendario);
router.post('/crearAusencia', requireRole(ROLE_GROUPS.FICHAJE), crearAusencia);

module.exports = router;
