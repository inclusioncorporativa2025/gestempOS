const express = require('express');
const router = express.Router();
const {
  responderPeticionCierre,
  getDatosUsuarioMes,
  getCierresMensualesByIdEmpresa,
  crearPeticionCierreMes,
  responderPeticion,
  getPeticionesByIdUsuario,
  getPeticionesByIdEmpresa,
  crearPeticionEdicion,
  getUltimoRegistroById,
  getDatosUsuario,
  crearRegistro,
  getTipoRegistroByIdUsuario,
  deleteRegistro,
  getHorasTrabajadasHoy,
  editarHoras,
  getDatosUsuarioById,
} = require('../controllers/fichajesController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

const GESTION_PETICIONES = ROLE_GROUPS.COMPANY_STAFF;

router.post('/getData', requireRole(ROLE_GROUPS.FICHAJE), getDatosUsuario);
router.post('/getDataById', requireRole(ROLE_GROUPS.FICHAJE), getDatosUsuarioById);

router.post('/create', requireRole(ROLE_GROUPS.FICHAJE), crearRegistro);
router.post('/getById', requireRole(ROLE_GROUPS.FICHAJE), getTipoRegistroByIdUsuario);
router.post('/delete', requireRole(ROLE_GROUPS.FICHAJE), deleteRegistro);
router.post('/getHoras', requireRole(ROLE_GROUPS.FICHAJE), getHorasTrabajadasHoy);
router.post('/getUltimoRegistroById', requireRole(ROLE_GROUPS.FICHAJE), getUltimoRegistroById);

router.post('/edit', requireRole(ROLE_GROUPS.COMPANY_STAFF), editarHoras);
router.post('/crearPeticionEdicion', requireRole(ROLE_GROUPS.FICHAJE), crearPeticionEdicion);
router.post('/crearPeticionCierreMes', requireRole(ROLE_GROUPS.FICHAJE), crearPeticionCierreMes);
router.post('/getPeticionesByIdUsuario', requireRole(ROLE_GROUPS.FICHAJE), getPeticionesByIdUsuario);

router.post('/getPeticionesByIdEmpresa', requireRole(GESTION_PETICIONES), getPeticionesByIdEmpresa);
router.post('/responderPeticion', requireRole(GESTION_PETICIONES), responderPeticion);
router.post('/getCierresMensualesByIdEmpresa', requireRole(GESTION_PETICIONES), getCierresMensualesByIdEmpresa);
router.post('/getDatosUsuarioMes', requireRole(GESTION_PETICIONES), getDatosUsuarioMes);
router.post('/responderPeticionCierre', requireRole(GESTION_PETICIONES), responderPeticionCierre);

module.exports = router;
