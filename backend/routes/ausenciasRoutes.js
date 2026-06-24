const express = require('express');
const router = express.Router();
const {
  getAusenciasByIdUsuario,
  crearAusencia,
  getAusenciasCalendario,
  getAusenciasListado,
  getAusenciasPendientesEmpresa,
  getHistorialAusenciasEmpresa,
  getAusenciasNotificacionesEmpleado,
  responderAusencia,
  marcarAusenciasVistas,
} = require('../controllers/ausenciasController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

router.post('/getAusenciasByIdUsuario', requireRole(ROLE_GROUPS.FICHAJE), getAusenciasByIdUsuario);
router.post('/getAusenciasCalendario', requireRole(ROLE_GROUPS.CALENDARIO_VIEW), getAusenciasCalendario);
router.post('/getAusenciasListado', requireRole(ROLE_GROUPS.CALENDARIO_VIEW), getAusenciasListado);
router.post('/getAusenciasPendientesEmpresa', requireRole(ROLE_GROUPS.COMPANY_STAFF), getAusenciasPendientesEmpresa);
router.post('/getHistorialAusenciasEmpresa', requireRole(ROLE_GROUPS.COMPANY_STAFF), getHistorialAusenciasEmpresa);
router.post('/getAusenciasNotificacionesEmpleado', requireRole(ROLE_GROUPS.FICHAJE), getAusenciasNotificacionesEmpleado);
router.post('/responderAusencia', requireRole(ROLE_GROUPS.COMPANY_STAFF), responderAusencia);
router.post('/marcarAusenciasVistas', requireRole(ROLE_GROUPS.FICHAJE), marcarAusenciasVistas);
router.post('/crearAusencia', requireRole(ROLE_GROUPS.FICHAJE), crearAusencia);

module.exports = router;
