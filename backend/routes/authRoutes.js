const express = require('express');
const router = express.Router();
const { login, forgotPassword, resetPassword } = require('../controllers/authLocalController');

router.post('/login', login);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);

// Con autenticación por JWT el logout es responsabilidad del cliente
// (descartar el token). Se mantiene el endpoint por compatibilidad.
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Sesión cerrada' });
});

module.exports = router;
