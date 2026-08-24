const express = require('express');
const {
  requireAuth,
  requireHubAccess,
  requireHubPermiso,
  requireHubGestorAccesos,
  requireHubPlataforma,
} = require('../middleware/hubMiddleware');
const {
  obtenerContexto,
  listarVentasHandler,
  listarInvitacionesHandler,
  listarComercialesHandler,
  crearInvitacionHandler,
  asignarVentaHandler,
  previewInvitacionHandler,
  listarAccesosHubHandler,
  listarPuestosHubHandler,
  listarUsuariosInternosHandler,
  asignarAccesoHubHandler,
  revocarAccesoHubHandler,
  obtenerMetricasDashboardHandler,
  eliminarVentaHandler,
  transferirVentaHandler,
  eliminarInvitacionHandler,
  transferirInvitacionHandler,
} = require('../controllers/hubController');

const router = express.Router();

/** Contexto de acceso (sin exigir hub previo: permite descubrir permisos tras login). */
router.get('/me', requireAuth, obtenerContexto);
router.get('/metricas', requireAuth, requireHubAccess, requireHubPlataforma, obtenerMetricasDashboardHandler);
router.get('/ventas', requireAuth, requireHubAccess, listarVentasHandler);
router.get('/invitaciones', requireAuth, requireHubAccess, listarInvitacionesHandler);
router.get('/comerciales', requireAuth, requireHubAccess, requireHubPermiso('asignar_comercial', 'ver_equipo', 'ver_todas'), listarComercialesHandler);
router.post('/invitaciones', requireAuth, requireHubAccess, requireHubPermiso('crear_invitacion'), crearInvitacionHandler);
router.post('/ventas/asignar', requireAuth, requireHubAccess, requireHubPermiso('asignar_comercial'), asignarVentaHandler);
router.delete('/ventas/:id', requireAuth, requireHubAccess, requireHubGestorAccesos, eliminarVentaHandler);
router.post('/ventas/:id/transferir', requireAuth, requireHubAccess, requireHubGestorAccesos, transferirVentaHandler);
router.delete('/invitaciones/:id', requireAuth, requireHubAccess, requireHubGestorAccesos, eliminarInvitacionHandler);
router.post('/invitaciones/:id/transferir', requireAuth, requireHubAccess, requireHubGestorAccesos, transferirInvitacionHandler);

router.get('/accesos', requireAuth, requireHubAccess, requireHubGestorAccesos, listarAccesosHubHandler);
router.get('/puestos', requireAuth, requireHubAccess, requireHubGestorAccesos, listarPuestosHubHandler);
router.get('/usuarios-internos', requireAuth, requireHubAccess, requireHubGestorAccesos, listarUsuariosInternosHandler);
router.post('/accesos', requireAuth, requireHubAccess, requireHubGestorAccesos, asignarAccesoHubHandler);
router.delete('/accesos/:id', requireAuth, requireHubAccess, requireHubGestorAccesos, revocarAccesoHubHandler);

/** Público: validar invitación antes del register */
router.get('/invitaciones/preview', previewInvitacionHandler);

module.exports = router;
