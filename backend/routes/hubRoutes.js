const express = require('express');
const {
  requireAuth,
  requireHubAccess,
  requireHubPermiso,
} = require('../middleware/hubMiddleware');
const {
  obtenerContexto,
  listarVentasHandler,
  listarComercialesHandler,
  crearInvitacionHandler,
  asignarVentaHandler,
  previewInvitacionHandler,
} = require('../controllers/hubController');

const router = express.Router();

router.get('/me', requireAuth, requireHubAccess, obtenerContexto);
router.get('/ventas', requireAuth, requireHubAccess, listarVentasHandler);
router.get('/comerciales', requireAuth, requireHubAccess, requireHubPermiso('asignar_comercial', 'ver_equipo', 'ver_todas'), listarComercialesHandler);
router.post('/invitaciones', requireAuth, requireHubAccess, requireHubPermiso('crear_invitacion'), crearInvitacionHandler);
router.post('/ventas/asignar', requireAuth, requireHubAccess, requireHubPermiso('asignar_comercial'), asignarVentaHandler);

/** Público: validar invitación antes del register */
router.get('/invitaciones/preview', previewInvitacionHandler);

module.exports = router;
