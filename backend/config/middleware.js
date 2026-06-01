const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const path = require('path');
const { APP_URL } = require('./appUrls');

const parseOrigins = (raw) =>
  String(raw || '')
    .split(',')
    .map((o) => o.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);

const isLocalDevOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const configureMiddleware = (app) => {

  app.use(helmet());

  const allowedOrigins = new Set(parseOrigins(process.env.ALLOWED_ORIGINS));
  if (APP_URL) {
    allowedOrigins.add(APP_URL);
  }

  const isDev = process.env.NODE_ENV !== 'production';

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const originAllowed =
      origin &&
      (allowedOrigins.has(origin) || (isDev && isLocalDevOrigin(origin)));

    if (originAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else if (allowedOrigins.size === 0 && !APP_URL) {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  });

  app.use('/utils/images', express.static(path.join(__dirname, '../utils/images')));

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return next();
    }

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decodedToken;
    } catch (error) {
      console.error('Error verificando token:', error.message);
    }

    next();
  });
};

module.exports = configureMiddleware;
