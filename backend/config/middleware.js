const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const path = require('path');
const { APP_URL, LANDING_URL } = require('./appUrls');

const parseOrigins = (raw) =>
  String(raw || '')
    .split(',')
    .map((o) => o.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);

const addOriginWithWwwVariant = (set, origin) => {
  if (!origin) return;

  set.add(origin);

  try {
    const parsed = new URL(origin);
    const { protocol, hostname, port } = parsed;

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('app.')) {
      return;
    }

    const portSuffix = port ? `:${port}` : '';

    if (hostname.startsWith('www.')) {
      set.add(`${protocol}//${hostname.slice(4)}${portSuffix}`);
    } else {
      set.add(`${protocol}//www.${hostname}${portSuffix}`);
    }
  } catch {
    // noop — origin ya añadido tal cual
  }
};

const buildAllowedOrigins = () => {
  const allowedOrigins = new Set();

  parseOrigins(process.env.ALLOWED_ORIGINS).forEach((origin) => {
    addOriginWithWwwVariant(allowedOrigins, origin);
  });

  addOriginWithWwwVariant(allowedOrigins, APP_URL);
  addOriginWithWwwVariant(allowedOrigins, LANDING_URL);

  return allowedOrigins;
};

const isLocalDevOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const configureMiddleware = (app) => {

  app.use(helmet());

  const allowedOrigins = buildAllowedOrigins();

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
