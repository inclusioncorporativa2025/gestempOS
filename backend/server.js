require('dotenv').config();

const express = require('express');
const http = require('http');

const configureMiddleware = require('./config/middleware');
const configureRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { connectToDatabase } = require('./config/db');
const { handleStripeWebhook } = require('./controllers/billingController');
const { handleWhatsappWebhookGet, handleWhatsappWebhookPost } = require('./controllers/whatsappWebhookController');
// const firebaseAdmin = require('./config/firebase');

const app = express();
const port = process.env.PORT || 5001;

// Detrás de nginx/proxy: necesario para rate limiting por IP real (X-Forwarded-For)
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);

// Webhook Stripe: body raw antes de express.json()
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook,
);

app.get('/api/whatsapp/webhook', handleWhatsappWebhookGet);

app.post(
  '/api/whatsapp/webhook',
  express.raw({ type: 'application/json' }),
  handleWhatsappWebhookPost,
);

// Ruta básica para comprobar que el backend está vivo
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'gestemp-backend',
    domain: 'app.timecor.es',
    port: port
  });
});

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