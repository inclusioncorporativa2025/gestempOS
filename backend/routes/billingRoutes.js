const express = require('express');
const {
  getEstado,
  postCheckout,
  postPortal,
  postCancelar,
  postReactivar,
  getSession,
  getFacturas,
} = require('../controllers/billingController');
const { requireAuth, requireRole, ROLES } = require('../middleware/authMiddleware');

const router = express.Router();

const requireBillingAccess = [
  requireAuth,
  requireRole(ROLES.ROOT, ROLES.PLATFORM_ADMIN, ROLES.ADMIN_EMPRESA),
];

router.get('/session/:sessionId/verify', getSession);
router.get('/estado', ...requireBillingAccess, getEstado);
router.get('/facturas', ...requireBillingAccess, getFacturas);
router.post('/checkout', ...requireBillingAccess, postCheckout);
router.post('/portal', ...requireBillingAccess, postPortal);
router.post('/cancelar', ...requireBillingAccess, postCancelar);
router.post('/reactivar', ...requireBillingAccess, postReactivar);
router.get('/session/:sessionId', ...requireBillingAccess, getSession);

module.exports = router;
