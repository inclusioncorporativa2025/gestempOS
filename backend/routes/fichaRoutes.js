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
  reverseGeocode,
  getEstadoPersonalEmpresa,
  countNotificacionesPendientes,
  countNotificacionesEmpleado,
  marcarPeticionesVistas,
  getHistorialEdicionesHorario,
  getHistorialCierresMensuales,
  getFirmaCierreMensual,
} = require('../controllers/fichajesController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

const GESTION_PETICIONES = ROLE_GROUPS.APROBACION_SOLICITUDES;

router.post('/getData', requireRole(ROLE_GROUPS.FICHAJE), getDatosUsuario);
router.post('/getDataById', requireRole(ROLE_GROUPS.FICHAJE), getDatosUsuarioById);
router.post('/reverseGeocode', requireRole(ROLE_GROUPS.FICHAJE), reverseGeocode);

router.post('/create', requireRole(ROLE_GROUPS.FICHAJE), crearRegistro);
router.post('/getById', requireRole(ROLE_GROUPS.FICHAJE), getTipoRegistroByIdUsuario);
router.post('/delete', requireRole(ROLE_GROUPS.FICHAJE), deleteRegistro);
router.post('/getHoras', requireRole(ROLE_GROUPS.FICHAJE), getHorasTrabajadasHoy);
router.post('/getUltimoRegistroById', requireRole(ROLE_GROUPS.FICHAJE), getUltimoRegistroById);

router.post('/edit', requireRole(ROLE_GROUPS.APROBACION_SOLICITUDES), editarHoras);
router.post('/crearPeticionEdicion', requireRole(ROLE_GROUPS.FICHAJE), crearPeticionEdicion);
router.post('/crearPeticionCierreMes', requireRole(ROLE_GROUPS.FICHAJE), crearPeticionCierreMes);
router.post('/getPeticionesByIdUsuario', requireRole(ROLE_GROUPS.FICHAJE), getPeticionesByIdUsuario);

router.post('/getHistorialEdicionesHorario', requireRole(GESTION_PETICIONES), getHistorialEdicionesHorario);
router.post('/countNotificacionesPendientes', requireRole(ROLE_GROUPS.APROBACION_SOLICITUDES), countNotificacionesPendientes);
router.post('/countNotificacionesEmpleado', requireRole(ROLE_GROUPS.FICHAJE), countNotificacionesEmpleado);
router.post('/marcarPeticionesVistas', requireRole(ROLE_GROUPS.FICHAJE), marcarPeticionesVistas);
router.post('/getPeticionesByIdEmpresa', requireRole(GESTION_PETICIONES), getPeticionesByIdEmpresa);
router.post('/responderPeticion', requireRole(ROLE_GROUPS.APROBACION_SOLICITUDES), responderPeticion);
router.post('/getCierresMensualesByIdEmpresa', requireRole(GESTION_PETICIONES), getCierresMensualesByIdEmpresa);
router.post('/getHistorialCierresMensuales', requireRole(GESTION_PETICIONES), getHistorialCierresMensuales);
router.post('/getFirmaCierreMensual', requireRole(ROLE_GROUPS.FICHAJE), getFirmaCierreMensual);
router.post('/getDatosUsuarioMes', requireRole(ROLE_GROUPS.FICHAJE), getDatosUsuarioMes);
router.post('/responderPeticionCierre', requireRole(ROLE_GROUPS.APROBACION_SOLICITUDES), responderPeticionCierre);
router.post('/getEstadoPersonalEmpresa', requireRole(ROLE_GROUPS.PRESENCIA_EQUIPO), getEstadoPersonalEmpresa);

module.exports = router;
