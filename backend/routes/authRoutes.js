const express = require('express');
const router = express.Router();
const {
  login,
  selectEmpresa,
  switchEmpresa,
  misEmpresas,
  forgotPassword,
  resetPassword,
} = require('../controllers/authLocalController');
const { registerCompanyPublic } = require('../controllers/companyController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/login', login);

router.post('/select-empresa', selectEmpresa);

router.get('/mis-empresas', requireAuth, misEmpresas);

router.post('/switch-empresa', requireAuth, switchEmpresa);

router.post('/register-company', registerCompanyPublic);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);

// Con autenticación por JWT el logout es responsabilidad del cliente
// (descartar el token). Se mantiene el endpoint por compatibilidad.
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Sesión cerrada' });
});

module.exports = router;
