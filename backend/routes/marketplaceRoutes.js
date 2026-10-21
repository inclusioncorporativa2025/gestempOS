const express = require('express');
const {
  getCatalogo,
  getEstadoEmpresa,
  postActivarModulo,
  postPreviewContratarPlazas,
  postContratarPlazas,
  postCancelarModulo,
  postListarAsignaciones,
  postGuardarAsignacion,
  postEjecutarAlertasFichaje,
} = require('../controllers/marketplaceController');
const { requireRole, ROLES, ROLE_GROUPS } = require('../middleware/authMiddleware');

const requireMarketplaceContratar = requireRole(
  ROLES.ROOT,
  ROLES.PLATFORM_ADMIN,
  ROLES.ADMIN_EMPRESA,
);

const router = express.Router();

router.post('/catalogo', requireRole(ROLE_GROUPS.COMPANY_STAFF), getCatalogo);

router.post('/empresa/estado', requireRole(ROLE_GROUPS.COMPANY_STAFF), getEstadoEmpresa);

router.post('/empresa/activar', requireRole(ROLES.ROOT), postActivarModulo);

router.post('/empresa/plazas/preview', requireMarketplaceContratar, postPreviewContratarPlazas);

router.post('/empresa/plazas/contratar', requireMarketplaceContratar, postContratarPlazas);

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

router.post(
  '/alertas/ejecutar',
  requireRole(ROLES.ROOT),
  postEjecutarAlertasFichaje,
);

module.exports = router;
