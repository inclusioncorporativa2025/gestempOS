const express = require('express');
const {
  postEstado,
  postCerrar,
  postOmitir,
  postMarcarPaso,
} = require('../controllers/onboardingController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/estado',
  requireRole(ROLE_GROUPS.FICHAJE),
  postEstado,
);

router.post(
  '/cerrar',
  requireRole(ROLE_GROUPS.FICHAJE),
  postCerrar,
);

router.post(
  '/omitir',
  requireRole(ROLE_GROUPS.FICHAJE),
  postOmitir,
);

router.post(
  '/paso',
  requireRole(ROLE_GROUPS.FICHAJE),
  postMarcarPaso,
);

module.exports = router;
