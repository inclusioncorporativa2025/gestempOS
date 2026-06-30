const express = require('express');
const router = express.Router();
const {
  getFestivosByIdEmpresa,
  getFestivosCalendario,
  guardarFestivoEmpresa,
  eliminarFestivoEmpresa,
  sincronizarFestivosOficialesHandler,
  getRegionesFestivos,
} = require('../controllers/calendarioController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

router.post('/getFestivosByIdEmpresa', requireRole(ROLE_GROUPS.CONFIG), getFestivosByIdEmpresa);
router.post('/getFestivosCalendario', requireRole(ROLE_GROUPS.CALENDARIO_VIEW), getFestivosCalendario);
router.post('/guardarFestivoEmpresa', requireRole(ROLE_GROUPS.CONFIG), guardarFestivoEmpresa);
router.post('/eliminarFestivoEmpresa', requireRole(ROLE_GROUPS.CONFIG), eliminarFestivoEmpresa);
router.post('/sincronizarFestivosOficiales', requireRole(ROLE_GROUPS.CONFIG), sincronizarFestivosOficialesHandler);
router.get('/regionesFestivos', requireRole(ROLE_GROUPS.CONFIG), getRegionesFestivos);

module.exports = router;
