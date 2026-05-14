const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const dotenv = require('dotenv');
const configureMiddleware = require('./config/middleware');
const configureRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const firebaseAdmin = require('./config/firebase');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

let server;
if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/fichaeneltrabajo.es/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/fichaeneltrabajo.es/fullchain.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/fichaeneltrabajo.es/chain.pem')
  };

  server = https.createServer(options, app);
  server.listen(8444, () => {
    console.log(`Servidor HTTPS corriendo en el puerto 8444`);
  });

  http.createServer((req, res) => {
    res.writeHead(301, { "Location": "https://" + req.headers['host'].replace(':5000', ':8444') + req.url });
    res.end();
  }).listen(5000, () => {
    console.log(`Servidor HTTP corriendo en el puerto 5000 (Redirigiendo a HTTPS)`);
  });

} else {
  server = http.createServer(app);
  server.listen(5000, () => {
    console.log(`Servidor HTTP corriendo en el puerto 5000`);
  });
}

configureMiddleware(app);
configureRoutes(app);
app.use(errorHandler);
