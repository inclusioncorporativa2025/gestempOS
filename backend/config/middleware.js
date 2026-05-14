const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const firebaseAdmin = require('./firebase');
const path = require('path');

const configureMiddleware = (app) => {

  app.use(helmet());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  });

  app.use('/utils/images', express.static(path.join(__dirname, '../utils/images')));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use(async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {

      return next();
    }

    try {

      const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
      req.user = decodedToken;
    } catch (error) {
      console.error('Error verificando token:', error.message);
    }

    next();
  });
};

module.exports = configureMiddleware;
