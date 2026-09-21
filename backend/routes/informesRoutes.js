const express = require('express');
const { getInformeProductividad } = require('../controllers/informesController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/productividad',
  requireRole(ROLE_GROUPS.COMPANY_STAFF),
  getInformeProductividad,
);

module.exports = router;
