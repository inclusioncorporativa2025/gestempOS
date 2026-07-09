const express = require('express');
const {
  getEstado,
  postCheckout,
  postPortal,
  postCancelar,
  postReactivar,
  postAmpliarLicencias,
  postCambiarPlan,
  postPreviewCambiarPlan,
  getRenovacionInfo,
  postRenovacionCheckout,
  getSession,
  getFacturas,
  getFacturaDocumento,
} = require('../controllers/billingController');
const { requireAuth, requireRole, ROLES } = require('../middleware/authMiddleware');

const router = express.Router();

const requireBillingAccess = [
  requireAuth,
  requireRole(ROLES.ROOT, ROLES.PLATFORM_ADMIN, ROLES.ADMIN_EMPRESA),
];

router.get('/session/:sessionId/verify', getSession);
router.get('/renovacion/info', getRenovacionInfo);
router.post('/renovacion/checkout', postRenovacionCheckout);
router.get('/estado', ...requireBillingAccess, getEstado);
router.get('/facturas', ...requireBillingAccess, getFacturas);
router.get('/facturas/:idFactura/documento', ...requireBillingAccess, getFacturaDocumento);
router.post('/checkout', ...requireBillingAccess, postCheckout);
router.post('/portal', ...requireBillingAccess, postPortal);
router.post('/cancelar', ...requireBillingAccess, postCancelar);
router.post('/reactivar', ...requireBillingAccess, postReactivar);
router.post('/ampliar-licencias', ...requireBillingAccess, postAmpliarLicencias);
router.post('/cambiar-plan/preview', ...requireBillingAccess, postPreviewCambiarPlan);
router.post('/cambiar-plan', ...requireBillingAccess, postCambiarPlan);
router.get('/session/:sessionId', ...requireBillingAccess, getSession);

module.exports = router;
