const express = require('express');
const router = express.Router();
const { getFestivosByIdEmpresa,guardarFestivoEmpresa,eliminarFestivoEmpresa } = require('../controllers/calendarioController');

router.post('/getFestivosByIdEmpresa', getFestivosByIdEmpresa);
router.post('/guardarFestivoEmpresa', guardarFestivoEmpresa);
router.post('/eliminarFestivoEmpresa', eliminarFestivoEmpresa);

module.exports = router;
