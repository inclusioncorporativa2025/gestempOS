const express = require('express');
const router = express.Router();
const {responderPeticionCierre,getDatosUsuarioMes,getCierresMensualesByIdEmpresa,crearPeticionCierreMes,responderPeticion,getPeticionesByIdUsuario,getPeticionesByIdEmpresa, crearPeticionEdicion,getUltimoRegistroById,getDatosUsuario,crearRegistro,getTipoRegistroByIdUsuario,deleteRegistro,getHorasTrabajadasHoy,editarHoras,getDatosUsuarioById,crearJornada } = require('../controllers/fichajesController');

router.post('/getData', getDatosUsuario);
router.post('/getDataById', getDatosUsuarioById);

router.post('/create', crearRegistro);
router.post('/getById', getTipoRegistroByIdUsuario);
router.post('/delete', deleteRegistro);
router.post('/getHoras', getHorasTrabajadasHoy);
router.post('/edit', editarHoras);
router.post('/getUltimoRegistroById', getUltimoRegistroById);
router.post('/crearPeticionEdicion', crearPeticionEdicion);
router.post('/getPeticionesByIdEmpresa', getPeticionesByIdEmpresa);
router.post('/getPeticionesByIdUsuario', getPeticionesByIdUsuario);
router.post('/responderPeticion', responderPeticion);
router.post('/crearPeticionCierreMes', crearPeticionCierreMes);

router.post('/getCierresMensualesByIdEmpresa', getCierresMensualesByIdEmpresa);
router.post('/getDatosUsuarioMes', getDatosUsuarioMes);
router.post('/responderPeticionCierre', responderPeticionCierre);

module.exports = router;
