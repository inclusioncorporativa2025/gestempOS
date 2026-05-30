const express = require('express');
const {
  registerCompany,
  getTipoRegistro,
  updateTipoRegistro,
  getEmpresas,
  editEmpresa,
  eliminarEmpresa,
  getEmpresasUsuarios,
} = require('../controllers/companyController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', requireRole(ROLE_GROUPS.PLATFORM), registerCompany);
router.get('/getEmpresas', requireRole(ROLE_GROUPS.PLATFORM), getEmpresas);
router.get('/getEmpresasUsuarios', requireRole(ROLE_GROUPS.PLATFORM), getEmpresasUsuarios);
router.post('/edit', requireRole(ROLE_GROUPS.PLATFORM), editEmpresa);
router.post('/delete', requireRole(ROLE_GROUPS.PLATFORM), eliminarEmpresa);

router.post('/getTipoRegistro', requireRole(ROLE_GROUPS.CONFIG), getTipoRegistro);
router.post('/updateTipoRegistro', requireRole(ROLE_GROUPS.CONFIG), updateTipoRegistro);

module.exports = router;
