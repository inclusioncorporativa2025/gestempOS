const express = require('express');
const {
  registerCompany,
  getTipoRegistro,
  updateTipoRegistro,
  getEmpresas,
  editEmpresa,
  eliminarEmpresa,
  reactivarEmpresa,
  getEmpresasUsuarios,
  getMiEmpresa,
  editMiEmpresa,
  getEmpresaBranding,
  purgaEmpresaPermanente,
} = require('../controllers/companyController');
const { requireRole, ROLE_GROUPS, ROLES } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', requireRole(ROLE_GROUPS.PLATFORM), registerCompany);
router.get('/getEmpresas', requireRole(ROLE_GROUPS.PLATFORM), getEmpresas);
router.get('/getEmpresasUsuarios', requireRole(ROLE_GROUPS.PLATFORM), getEmpresasUsuarios);
router.post('/edit', requireRole(ROLE_GROUPS.PLATFORM), editEmpresa);
router.post('/delete', requireRole(ROLE_GROUPS.PLATFORM), eliminarEmpresa);
router.post('/reactivar', requireRole(ROLE_GROUPS.PLATFORM), reactivarEmpresa);
router.post('/purge', requireRole(ROLES.ROOT), purgaEmpresaPermanente);

router.post('/getTipoRegistro', requireRole(ROLE_GROUPS.CONFIG), getTipoRegistro);
router.post('/updateTipoRegistro', requireRole(ROLE_GROUPS.CONFIG), updateTipoRegistro);

router.get('/miEmpresa', requireRole(ROLE_GROUPS.CONFIG), getMiEmpresa);
router.post('/editMiEmpresa', requireRole(ROLE_GROUPS.CONFIG), editMiEmpresa);
router.get('/branding', requireRole(ROLE_GROUPS.FICHAJE), getEmpresaBranding);

module.exports = router;
