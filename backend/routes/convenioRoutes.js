const express = require('express');
const {
  getCatalogo,
  getCatalogoItem,
  postCatalogo,
  putCatalogo,
  deleteCatalogo,
  getEmpresaConvenios,
  postIncorporarEmpresa,
  putEmpresaConvenio,
  deleteEmpresaConvenio,
  getConvenioUsuario,
  postPreviewDiasAusencia,
} = require('../controllers/convenioController');
const { requireAuth, requireRole, ROLE_GROUPS, ROLES } = require('../middleware/authMiddleware');

const router = express.Router();

const staffEmpresa = [requireAuth, requireRole(...ROLE_GROUPS.CONFIG)];

router.post('/catalogo/listar', requireAuth, getCatalogo);
router.post('/catalogo/detalle', requireAuth, requireRole(ROLES.ROOT), getCatalogoItem);
router.post('/catalogo/crear', requireAuth, requireRole(ROLES.ROOT), postCatalogo);
router.post('/catalogo/actualizar', requireAuth, requireRole(ROLES.ROOT), putCatalogo);
router.post('/catalogo/baja', requireAuth, requireRole(ROLES.ROOT), deleteCatalogo);

router.post('/empresa/listar', ...staffEmpresa, getEmpresaConvenios);
router.post('/empresa/incorporar', ...staffEmpresa, postIncorporarEmpresa);
router.post('/empresa/actualizar', ...staffEmpresa, putEmpresaConvenio);
router.post('/empresa/baja', ...staffEmpresa, deleteEmpresaConvenio);

router.post('/usuario', requireAuth, getConvenioUsuario);
router.post('/preview-dias', requireAuth, postPreviewDiasAusencia);

module.exports = router;
