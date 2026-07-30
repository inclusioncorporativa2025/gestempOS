const express = require('express');
const {
  getPendiente,
  getListar,
  postMarcarVista,
  getAdminListar,
  postAdminCrear,
  postAdminActualizar,
  postAdminBaja,
} = require('../controllers/novedadController');
const { requireAuth, requireRole, ROLES } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/pendiente', getPendiente);
router.post('/listar', getListar);
router.post('/marcar-vista', postMarcarVista);

router.post('/admin/listar', requireRole(ROLES.ROOT), getAdminListar);
router.post('/admin/crear', requireRole(ROLES.ROOT), postAdminCrear);
router.post('/admin/actualizar', requireRole(ROLES.ROOT), postAdminActualizar);
router.post('/admin/baja', requireRole(ROLES.ROOT), postAdminBaja);

module.exports = router;
