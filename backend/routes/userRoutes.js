const express = require('express');
const router = express.Router();
const {
  getUserData,
  getMiPerfil,
  editMiPerfil,
  crearUsuario,
  getUsuariosEmpresa,
  editUsuario,
  exportarDatosExcel,
  enviarRegistrosHorariosPorEmail,
  deleteUsuario,
  getHorasTotalesMesByIdUsuario,
  getResumenHorasMes,
  getTipoHoraUsuario,
  getBolsaHoras,
  ajustarBolsaHoras,
  importarUsuariosEmpresa,
} = require('../controllers/userController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

router.post('/getData', requireRole(ROLE_GROUPS.ALL), getUserData);
router.post('/miPerfil', requireRole(ROLE_GROUPS.ALL), getMiPerfil);
router.post('/editMiPerfil', requireRole(ROLE_GROUPS.ALL), editMiPerfil);

router.post('/crear', requireRole(ROLE_GROUPS.USER_WRITE), crearUsuario);
router.post('/getUsuariosEmpresa', requireRole(ROLE_GROUPS.PERSONAL_LIST), getUsuariosEmpresa);
router.post('/edit', requireRole(ROLE_GROUPS.USER_WRITE), editUsuario);
router.post('/delete', requireRole(ROLE_GROUPS.USER_WRITE), deleteUsuario);
router.post(
  '/getHorasTotalesMesByIdUsuario',
  requireRole(ROLE_GROUPS.FICHAJE),
  getHorasTotalesMesByIdUsuario,
);
router.post(
  '/getResumenHorasMes',
  requireRole(ROLE_GROUPS.FICHAJE),
  getResumenHorasMes,
);
router.post(
  '/getTipoHoraUsuario',
  requireRole(ROLE_GROUPS.FICHAJE),
  getTipoHoraUsuario,
);
router.post(
  '/getBolsaHoras',
  requireRole(ROLE_GROUPS.FICHAJE),
  getBolsaHoras,
);
router.post(
  '/ajustarBolsaHoras',
  requireRole(ROLE_GROUPS.USER_WRITE),
  ajustarBolsaHoras,
);
router.post('/exportar', requireRole(ROLE_GROUPS.COMPANY_STAFF), exportarDatosExcel);
router.post('/exportar/enviar', requireRole(ROLE_GROUPS.COMPANY_STAFF), enviarRegistrosHorariosPorEmail);
router.post('/importar', requireRole(ROLE_GROUPS.USER_WRITE), importarUsuariosEmpresa);

module.exports = router;
