import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { APP_ROUTES } from '../../../constants/routes';
import { dispatchOpenFacturacion } from '../../../constants/facturacion';

/** Redirige a inicio y abre el modal de facturación (solo admin). */
const FacturacionPage = () => {
  useEffect(() => {
    dispatchOpenFacturacion();
  }, []);

  return <Navigate to={APP_ROUTES.home} replace />;
};

export default FacturacionPage;
