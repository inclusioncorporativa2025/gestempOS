const express = require('express');
const router = express.Router();
const {
  getAusenciasByIdUsuario,
  crearAusencia,
  getAusenciasCalendario,
  getAusenciasListado,
  getAusenciasPendientesEmpresa,
  getHistorialAusenciasEmpresa,
  getAusenciasNotificacionesEmpleado,
  responderAusencia,
  marcarAusenciasVistas,
  subirJustificanteAusencia,
  listarJustificantesAusencia,
  descargarJustificanteAusencia,
} = require('../controllers/ausenciasController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');
const { uploadJustificanteAusencia } = require('../middleware/uploadAusenciaJustificante');

const handleMulterError = (err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'El archivo supera el tamaño máximo permitido (5 MB)',
      code: 'ARCHIVO_DEMASIADO_GRANDE',
    });
  }
  return res.status(400).json({
    error: err.message || 'Error al procesar el archivo',
    code: 'ARCHIVO_INVALIDO',
  });
};

router.post('/getAusenciasByIdUsuario', requireRole(ROLE_GROUPS.FICHAJE), getAusenciasByIdUsuario);
router.post('/getAusenciasCalendario', requireRole(ROLE_GROUPS.CALENDARIO_VIEW), getAusenciasCalendario);
router.post('/getAusenciasListado', requireRole(ROLE_GROUPS.CALENDARIO_VIEW), getAusenciasListado);
router.post('/getAusenciasPendientesEmpresa', requireRole(ROLE_GROUPS.COMPANY_STAFF), getAusenciasPendientesEmpresa);
router.post('/getHistorialAusenciasEmpresa', requireRole(ROLE_GROUPS.COMPANY_STAFF), getHistorialAusenciasEmpresa);
router.post('/getAusenciasNotificacionesEmpleado', requireRole(ROLE_GROUPS.FICHAJE), getAusenciasNotificacionesEmpleado);
router.post('/responderAusencia', requireRole(ROLE_GROUPS.COMPANY_STAFF), responderAusencia);
router.post('/marcarAusenciasVistas', requireRole(ROLE_GROUPS.FICHAJE), marcarAusenciasVistas);
router.post('/crearAusencia', requireRole(ROLE_GROUPS.FICHAJE), crearAusencia);
router.post(
  '/subirJustificanteAusencia',
  requireRole(ROLE_GROUPS.FICHAJE),
  uploadJustificanteAusencia.single('archivo'),
  handleMulterError,
  subirJustificanteAusencia,
);
router.post('/listarJustificantesAusencia', requireRole(ROLE_GROUPS.FICHAJE), listarJustificantesAusencia);
router.post('/descargarJustificanteAusencia', requireRole(ROLE_GROUPS.FICHAJE), descargarJustificanteAusencia);

module.exports = router;
