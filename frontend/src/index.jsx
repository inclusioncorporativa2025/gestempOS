import React from 'react';
import ReactDOM from 'react-dom/client';
import './config/httpInterceptor'; // Inyecta el token JWT en las llamadas a la API
import './styles/variables.css'; // Fuente Filson Soft + variables (design tokens)
import './index.css'; // Si tienes estilos globales
import App from './App'; // Importa el componente App
import { BrowserRouter as Router } from 'react-router-dom'; // Importa el Router
import { AuthProvider } from './config/AuthContext';
import AntDesignProvider from './config/AntDesignProvider';
import { LANDING_URL } from './constants/urls';
import { isAppSubdomain } from './utils/host';
import { isCampaignLandingPath } from './utils/appLinks';

if (
  typeof window !== 'undefined'
  && isAppSubdomain()
  && isCampaignLandingPath(window.location.pathname)
) {
  const landingOrigin = LANDING_URL.replace(/\/$/, '');
  if (window.location.origin !== landingOrigin) {
    window.location.replace(
      `${landingOrigin}${window.location.pathname}${window.location.search}`,
    );
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

// Asegúrate de envolver el componente App con Router
root.render(
  <AuthProvider>
    <AntDesignProvider>
      <Router>
        <App />
      </Router>
    </AntDesignProvider>
  </AuthProvider>
);
