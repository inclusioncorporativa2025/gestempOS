mi-aplicacion/
├── backend/
│   ├── config/
│   │   ├── db.js                 # Configuración de la base de datos (incluye conexión y pool)
│   │   ├── server.js             # Configuración general del servidor
│   │   ├── subdomains.js         # Lógica para manejo de subdominios
│   ├── controllers/
│   │   ├── authController.js     # Autenticación y manejo de usuarios
│   │   ├── companyController.js  # CRUD de empresas
│   │   ├── timeTrackingController.js # Registro de horas
│   ├── middlewares/
│   │   ├── authMiddleware.js     # Verificación de autenticación
│   │   ├── subdomainMiddleware.js # Detecta y maneja subdominios
│   ├── models/
│   │   ├── User.js               # Modelo de usuario
│   │   ├── Company.js            # Modelo de empresa
│   │   ├── TimeEntry.js          # Modelo de registro de horas
│   ├── routes/
│   │   ├── authRoutes.js         # Rutas relacionadas con autenticación
│   │   ├── companyRoutes.js      # Rutas para empresas
│   │   ├── timeTrackingRoutes.js # Rutas para registro de horas
│   ├── scripts/
│   │   ├── setupSchema.js        # Script para configurar esquemas y tablas de PostgreSQL
│   │   ├── setupSubdomain.js     # Script para agregar subdominios
│   │   ├── migrate.js            # Script para migraciones futuras
│   ├── app.js                    # Configuración principal del servidor (Express)
│   ├── package.json              # Dependencias del backend
├── frontend/
│   ├── public/
│   │   ├── index.html            # Punto de entrada de la aplicación web
│   │   ├── styles.css            # Estilos globales
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoginForm.js      # Componente de inicio de sesión
│   │   │   ├── Dashboard.js      # Tablero principal para los empleados
│   │   │   ├── AdminPanel.js     # Panel de administración por empresa
│   │   ├── pages/
│   │   │   ├── HomePage.js       # Página de inicio
│   │   │   ├── TimeTrackingPage.js # Página de registro de horas
│   │   ├── App.js                # Componente principal de React
│   │   ├── index.js              # Punto de entrada del frontend
│   ├── package.json              # Dependencias del frontend
├── infrastructure/
│   ├── nginx/
│   │   ├── default.conf          # Configuración del proxy inverso para subdominios
│   ├── docker-compose.yml        # Configuración para contenedores Docker
│   ├── certs/                    # Certificados SSL para los subdominios
│   │   ├── wildcard.pem          # Certificado wildcard para *.miaplicacion.com
├── README.md                     # Documentación del proyecto
