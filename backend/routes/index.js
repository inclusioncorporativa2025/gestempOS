const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const companyRoutes = require('./companyRoutes');
const fichaRoutes = require('./fichaRoutes');
const jornadaRoutes = require('./jornadaRoutes');
const calendarioRoutes = require('./calendarioRoutes');
const ausenciasRoutes = require('./ausenciasRoutes');
const vacacionesRoutes = require('./vacacionesRoutes');
const nominasRoutes = require('./nominasRoutes');
const supportRoutes = require('./supportRoutes');
const platformRoutes = require('./platformRoutes');
const billingRoutes = require('./billingRoutes');
const whatsappRoutes = require('./whatsappRoutes');
const landingRoutes = require('./landingRoutes');
const convenioRoutes = require('./convenioRoutes');
const { requireAuth, requireOwnEmpresa } = require('../middleware/authMiddleware');

/** Rutas con ámbito de empresa: el JWT debe coincidir con idEmpresa del body (tipos 3–6) */
const empresaScope = [requireAuth, requireOwnEmpresa];

const configureRoutes = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/user', ...empresaScope, userRoutes);
  app.use('/api/empresas', requireAuth, companyRoutes);
  app.use('/api/ficha', ...empresaScope, fichaRoutes);
  app.use('/api/jornada', ...empresaScope, jornadaRoutes);
  app.use('/api/calendario', ...empresaScope, calendarioRoutes);
  app.use('/api/ausencias', ...empresaScope, ausenciasRoutes);
  app.use('/api/vacaciones', ...empresaScope, vacacionesRoutes);
  app.use('/api/convenios', ...empresaScope, convenioRoutes);
  app.use('/api/nominas', ...empresaScope, nominasRoutes);
  app.use('/api/support', supportRoutes);
  app.use('/api/platform', requireAuth, platformRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/whatsapp', ...empresaScope, whatsappRoutes);
  app.use('/api/landing', landingRoutes);
};

module.exports = configureRoutes;
