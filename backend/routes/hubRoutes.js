const express = require('express');
const {
  requireAuth,
  requireHubAccess,
  requireHubPermiso,
  requireHubGestorAccesos,
} = require('../middleware/hubMiddleware');
const {
  obtenerContexto,
  listarVentasHandler,
  listarComercialesHandler,
  crearInvitacionHandler,
  asignarVentaHandler,
  previewInvitacionHandler,
  listarAccesosHubHandler,
  listarPuestosHubHandler,
  listarUsuariosInternosHandler,
  asignarAccesoHubHandler,
  revocarAccesoHubHandler,
} = require('../controllers/hubController');

const router = express.Router();

router.get('/me', requireAuth, requireHubAccess, obtenerContexto);
router.get('/ventas', requireAuth, requireHubAccess, listarVentasHandler);
router.get('/comerciales', requireAuth, requireHubAccess, requireHubPermiso('asignar_comercial', 'ver_equipo', 'ver_todas'), listarComercialesHandler);
router.post('/invitaciones', requireAuth, requireHubAccess, requireHubPermiso('crear_invitacion'), crearInvitacionHandler);
router.post('/ventas/asignar', requireAuth, requireHubAccess, requireHubPermiso('asignar_comercial'), asignarVentaHandler);

router.get('/accesos', requireAuth, requireHubAccess, requireHubGestorAccesos, listarAccesosHubHandler);
router.get('/puestos', requireAuth, requireHubAccess, requireHubGestorAccesos, listarPuestosHubHandler);
router.get('/usuarios-internos', requireAuth, requireHubAccess, requireHubGestorAccesos, listarUsuariosInternosHandler);
router.post('/accesos', requireAuth, requireHubAccess, requireHubGestorAccesos, asignarAccesoHubHandler);
router.delete('/accesos/:id', requireAuth, requireHubAccess, requireHubGestorAccesos, revocarAccesoHubHandler);

/** Público: validar invitación antes del register */
router.get('/invitaciones/preview', previewInvitacionHandler);

module.exports = router;
