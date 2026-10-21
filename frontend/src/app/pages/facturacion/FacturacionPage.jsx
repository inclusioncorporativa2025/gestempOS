import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { APP_ROUTES } from '../../../constants/routes';
import { dispatchOpenFacturacion } from '../../../constants/facturacion';

/** Redirige a inicio y abre el modal de facturación (solo admin). */
const FacturacionPage = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    dispatchOpenFacturacion({
      focusLicencias: searchParams.get('focus') === 'licencias',
    });
  }, [searchParams]);

  return <Navigate to={APP_ROUTES.home} replace />;
};

export default FacturacionPage;
