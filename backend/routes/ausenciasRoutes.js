const express = require('express');
const router = express.Router();
const { getAusenciasByIdUsuario,crearAusencia } = require('../controllers/ausenciasController');

router.post('/getAusenciasByIdUsuario', getAusenciasByIdUsuario);
router.post('/crearAusencia', crearAusencia);

module.exports = router;
