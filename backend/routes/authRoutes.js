const express = require('express');
const router = express.Router();
const { logout, createUser, crearUsuarioFirebase, completarRegistro } = require('../controllers/authController');
const { login, forgotPassword, resetPassword } = require('../controllers/authLocalController');

router.post('/login', login);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);

router.post('/logout', logout);

router.post('/register', createUser);

router.post('/crearUsuario', crearUsuarioFirebase);

router.post('/completarRegistro', completarRegistro);

module.exports = router;
