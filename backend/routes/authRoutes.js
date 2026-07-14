const express = require('express');
const router = express.Router();
const {
  login,
  selectEmpresa,
  switchEmpresa,
  misEmpresas,
  forgotPassword,
  resetPassword,
  reanudarCheckout,
} = require('../controllers/authLocalController');
const { registerCompanyPublic } = require('../controllers/companyController');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');

router.post('/login', authLimiter, login);

router.post('/reanudar-checkout', authLimiter, reanudarCheckout);

router.post('/select-empresa', authLimiter, selectEmpresa);

router.get('/mis-empresas', requireAuth, misEmpresas);

router.post('/switch-empresa', requireAuth, switchEmpresa);

router.post('/register-company', registerLimiter, registerCompanyPublic);

router.post('/forgot-password', authLimiter, forgotPassword);

router.post('/reset-password', authLimiter, resetPassword);

// Con autenticación por JWT el logout es responsabilidad del cliente
// (descartar el token). Se mantiene el endpoint por compatibilidad.
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Sesión cerrada' });
});

module.exports = router;
