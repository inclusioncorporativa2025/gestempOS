const express = require('express');
const router = express.Router();
const { login, logout, createUser, crearUsuarioFirebase, completarRegistro } = require('../controllers/authController');

router.post('/login', login);

router.post('/logout', logout);

router.post('/register', createUser);

router.post('/crearUsuario', crearUsuarioFirebase);

router.post('/completarRegistro', completarRegistro);

module.exports = router;
