const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const companyRoutes = require('./companyRoutes');
const fichaRoutes = require('./fichaRoutes');
const jornadaRoutes = require('./jornadaRoutes');
const calendarioRoutes = require('./calendarioRoutes');
const ausenciasRoutes = require('./ausenciasRoutes');

const configureRoutes = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/empresas', companyRoutes);
  app.use('/api/ficha', fichaRoutes);
  app.use('/api/jornada', jornadaRoutes);
  app.use('/api/calendario', calendarioRoutes);
  app.use('/api/ausencias', ausenciasRoutes);
};

module.exports = configureRoutes;
