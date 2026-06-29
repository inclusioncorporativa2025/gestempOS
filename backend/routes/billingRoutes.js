const express = require('express');
const {
  getEstado,
  postCheckout,
  postPortal,
  postCancelar,
  postReactivar,
  getSession,
} = require('../controllers/billingController');
const { requireAuth, requireRole, ROLES } = require('../middleware/authMiddleware');

const router = express.Router();

const requireAdminEmpresa = [requireAuth, requireRole(ROLES.ADMIN_EMPRESA)];

router.get('/session/:sessionId/verify', getSession);
router.get('/estado', ...requireAdminEmpresa, getEstado);
router.post('/checkout', ...requireAdminEmpresa, postCheckout);
router.post('/portal', ...requireAdminEmpresa, postPortal);
router.post('/cancelar', ...requireAdminEmpresa, postCancelar);
router.post('/reactivar', ...requireAdminEmpresa, postReactivar);
router.get('/session/:sessionId', ...requireAdminEmpresa, getSession);

module.exports = router;
