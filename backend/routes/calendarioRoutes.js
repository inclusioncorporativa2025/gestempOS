const express = require('express');
const router = express.Router();
const {
  getFestivosByIdEmpresa,
  guardarFestivoEmpresa,
  eliminarFestivoEmpresa,
} = require('../controllers/calendarioController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

router.post('/getFestivosByIdEmpresa', requireRole(ROLE_GROUPS.CONFIG), getFestivosByIdEmpresa);
router.post('/guardarFestivoEmpresa', requireRole(ROLE_GROUPS.CONFIG), guardarFestivoEmpresa);
router.post('/eliminarFestivoEmpresa', requireRole(ROLE_GROUPS.CONFIG), eliminarFestivoEmpresa);

module.exports = router;
