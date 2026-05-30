const express = require('express');
const router = express.Router();
const {
  getUserData,
  crearUsuario,
  getUsuariosEmpresa,
  editUsuario,
  exportarDatosExcel,
  deleteUsuario,
  getHorasTotalesMesByIdUsuario,
  importarUsuariosEmpresa,
} = require('../controllers/userController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

router.post('/getData', requireRole(ROLE_GROUPS.ALL), getUserData);

router.post('/crear', requireRole(ROLE_GROUPS.USER_WRITE), crearUsuario);
router.post('/getUsuariosEmpresa', requireRole(ROLE_GROUPS.PERSONAL_LIST), getUsuariosEmpresa);
router.post('/edit', requireRole(ROLE_GROUPS.USER_WRITE), editUsuario);
router.post('/delete', requireRole(ROLE_GROUPS.USER_WRITE), deleteUsuario);
router.post(
  '/getHorasTotalesMesByIdUsuario',
  requireRole(ROLE_GROUPS.COMPANY_STAFF),
  getHorasTotalesMesByIdUsuario,
);
router.post('/exportar', requireRole(ROLE_GROUPS.COMPANY_STAFF), exportarDatosExcel);
router.post('/importar', requireRole(ROLE_GROUPS.USER_WRITE), importarUsuariosEmpresa);

module.exports = router;
