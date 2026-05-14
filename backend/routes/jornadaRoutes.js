const express = require('express');
const router = express.Router();
const { obtenerUsuariosJornadas,crearJornada,obtenerJornadasYRegistros,deleteById,obtenerJornadas,obtenerJornadasByIdEmpresa } = require('../controllers/jornadaController');

router.post('/crearJornada', crearJornada);
router.post('/obtenerJornadasYRegistros', obtenerJornadasYRegistros);
router.post('/obtenerJornadas', obtenerJornadas);
router.post('/obtenerUsuariosJornadas', obtenerUsuariosJornadas);

router.post('/obtenerJornadasByIdEmpresa', obtenerJornadasByIdEmpresa);

router.post('/deleteById', deleteById);

module.exports = router;
