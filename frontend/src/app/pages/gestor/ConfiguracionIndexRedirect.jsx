import { Navigate } from 'react-router-dom';
import { APP_ROUTES } from '../../../constants/routes';
import { useAuth } from '../../../config/AuthContext';

const TIPOS_CONFIG_ORG = [1, 2, 3, 4];

const ConfiguracionIndexRedirect = () => {
  const { user } = useAuth();
  const puedeConfigOrg = TIPOS_CONFIG_ORG.includes(Number(user?.tipo_usuario));

  if (puedeConfigOrg) {
    return <Navigate to="empresa" replace />;
  }

  return <Navigate to={APP_ROUTES.miPerfil} replace />;
};

export default ConfiguracionIndexRedirect;
