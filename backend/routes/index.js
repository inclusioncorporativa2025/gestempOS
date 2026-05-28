const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const companyRoutes = require('./companyRoutes');
const fichaRoutes = require('./fichaRoutes');
const jornadaRoutes = require('./jornadaRoutes');
const calendarioRoutes = require('./calendarioRoutes');
const ausenciasRoutes = require('./ausenciasRoutes');
const { requireAuth } = require('../middleware/authMiddleware');

const configureRoutes = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/user', requireAuth, userRoutes);
  app.use('/api/empresas', requireAuth, companyRoutes);
  app.use('/api/ficha', requireAuth, fichaRoutes);
  app.use('/api/jornada', requireAuth, jornadaRoutes);
  app.use('/api/calendario', requireAuth, calendarioRoutes);
  app.use('/api/ausencias', requireAuth, ausenciasRoutes);
};

module.exports = configureRoutes;
