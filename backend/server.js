const express = require('express');
const http = require('http');
const dotenv = require('dotenv');

const configureMiddleware = require('./config/middleware');
const configureRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { connectToDatabase } = require('./config/db');
// const firebaseAdmin = require('./config/firebase');

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

configureMiddleware(app);
configureRoutes(app);
app.use(errorHandler);

const startServer = () => {
  const server = http.createServer(app);

  server.listen(port, '127.0.0.1', () => {
    console.log(`Servidor HTTP corriendo en http://127.0.0.1:${port}`);
  });
};

const iniciarServidor = async () => {
  try {
    await connectToDatabase();
    startServer();
  } catch (error) {
    console.error('No se pudo iniciar el servidor por un fallo de base de datos.');
    console.error(error);
    process.exit(1);
  }
};

iniciarServidor();