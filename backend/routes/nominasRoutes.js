const express = require('express');
const router = express.Router();
const {
  getRetribucion,
  guardarRetribucionUsuario,
  listarNominas,
  misNominas,
  subirNomina,
  descargarNomina,
  eliminarNomina,
} = require('../controllers/nominasController');
const { requireRole, ROLE_GROUPS, ROLES } = require('../middleware/authMiddleware');
const { uploadNominaPdf } = require('../middleware/uploadNomina');

const handleMulterError = (err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      message: 'El PDF supera el tamaño máximo permitido (5 MB)',
      code: 'ARCHIVO_DEMASIADO_GRANDE',
    });
  }
  return res.status(400).json({
    message: err.message || 'Error al procesar el archivo',
    code: 'ARCHIVO_INVALIDO',
  });
};

router.post('/getRetribucion', requireRole(ROLE_GROUPS.USER_WRITE), getRetribucion);
router.post('/guardarRetribucion', requireRole(ROLE_GROUPS.USER_WRITE), guardarRetribucionUsuario);

router.post('/listarNominas', requireRole(ROLE_GROUPS.USER_WRITE), listarNominas);
router.post(
  '/subirNomina',
  requireRole(ROLE_GROUPS.USER_WRITE),
  uploadNominaPdf.single('archivo'),
  handleMulterError,
  subirNomina,
);
router.post('/eliminarNomina', requireRole(ROLE_GROUPS.USER_WRITE), eliminarNomina);

router.post('/misNominas', requireRole(ROLES.EMPLEADO), misNominas);
router.post('/descargarNomina', requireRole(ROLE_GROUPS.FICHAJE), descargarNomina);

module.exports = router;
