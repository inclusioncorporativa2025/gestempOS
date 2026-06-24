const express = require('express');
const router = express.Router();
const {
  getSaldoVacaciones,
  guardarCupoVacaciones,
  ajustarSaldoVacaciones,
} = require('../controllers/vacacionesController');
const { requireRole, ROLE_GROUPS } = require('../middleware/authMiddleware');

router.post('/getSaldoVacaciones', requireRole(ROLE_GROUPS.FICHAJE), getSaldoVacaciones);
router.post('/guardarCupoVacaciones', requireRole(ROLE_GROUPS.USER_WRITE), guardarCupoVacaciones);
router.post('/ajustarSaldoVacaciones', requireRole(ROLE_GROUPS.USER_WRITE), ajustarSaldoVacaciones);

module.exports = router;
