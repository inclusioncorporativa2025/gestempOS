const express = require('express');
const router = express.Router();
const { getUserData,crearUsuario,getUsuariosEmpresa,editUsuario,exportarDatosExcel ,deleteUsuario,getHorasTotalesMesByIdUsuario,importarUsuariosEmpresa } = require('../controllers/userController');

router.post('/getData', getUserData);

router.post('/crear', crearUsuario);
router.post('/getUsuariosEmpresa', getUsuariosEmpresa);
router.post('/edit', editUsuario);
router.post('/delete', deleteUsuario);
router.post('/getHorasTotalesMesByIdUsuario', getHorasTotalesMesByIdUsuario);
router.post('/exportar', exportarDatosExcel);
router.post('/importar', importarUsuariosEmpresa);

module.exports = router;
