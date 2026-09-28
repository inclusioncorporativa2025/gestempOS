import { Navigate } from 'react-router-dom';
import { APP_ROUTES } from '../../../constants/routes';

/** @deprecated Mi cuenta vive en Mi perfil */
const ConfiguracionUsuario = () => (
  <Navigate to={APP_ROUTES.miPerfil} replace />
);

export default ConfiguracionUsuario;
