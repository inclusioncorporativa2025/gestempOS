const express = require('express');
const {
  getCatalogo,
  getEstadoEmpresa,
  postActivarModulo,
  postCancelarModulo,
  postListarAsignaciones,
  postGuardarAsignacion,
} = require('../controllers/marketplaceController');
const { requireRole, ROLES, ROLE_GROUPS } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/catalogo', requireRole(ROLES.ROOT), getCatalogo);

router.post('/empresa/estado', requireRole(ROLE_GROUPS.COMPANY_STAFF), getEstadoEmpresa);

router.post('/empresa/activar', requireRole(ROLES.ROOT), postActivarModulo);

router.post('/empresa/cancelar', requireRole(ROLES.ROOT), postCancelarModulo);

router.post(
  '/asignaciones/listar',
  requireRole(ROLE_GROUPS.COMPANY_STAFF),
  postListarAsignaciones,
);

router.post(
  '/asignaciones/guardar',
  requireRole(ROLE_GROUPS.COMPANY_STAFF),
  postGuardarAsignacion,
);

module.exports = router;
