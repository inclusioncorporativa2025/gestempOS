const express = require('express');
const { registerCompany, getTipoRegistro,updateTipoRegistro,getEmpresas,editEmpresa,eliminarEmpresa,getEmpresasUsuarios } = require('../controllers/companyController');
const router = express.Router();

router.post('/create', registerCompany);
router.post('/getTipoRegistro', getTipoRegistro);
router.post('/updateTipoRegistro', updateTipoRegistro);
router.get('/getEmpresas', getEmpresas);
router.get('/getEmpresasUsuarios', getEmpresasUsuarios);

router.post('/edit', editEmpresa);
router.post('/delete', eliminarEmpresa);

module.exports = router;
