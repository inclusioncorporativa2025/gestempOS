const express = require('express');
const router = express.Router();
const {
  obtenerUsuariosJornadas,
  crearJornada,
  obtenerJornadasYRegistros,
  deleteById,
  obtenerJornadas,
  obtenerJornadasByIdEmpresa,
} = require('../controllers/jornadaController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

router.post('/crearJornada', requireRole(ROLE_GROUPS.CONFIG), crearJornada);
router.post('/obtenerJornadasYRegistros', requireRole(ROLE_GROUPS.CONFIG), obtenerJornadasYRegistros);
router.post('/obtenerJornadas', requireRole(ROLE_GROUPS.CONFIG), obtenerJornadas);
router.post('/obtenerUsuariosJornadas', requireRole(ROLE_GROUPS.CONFIG), obtenerUsuariosJornadas);
router.post('/obtenerJornadasByIdEmpresa', requireRole(ROLE_GROUPS.CONFIG), obtenerJornadasByIdEmpresa);
router.post('/deleteById', requireRole(ROLE_GROUPS.CONFIG), deleteById);

module.exports = router;
