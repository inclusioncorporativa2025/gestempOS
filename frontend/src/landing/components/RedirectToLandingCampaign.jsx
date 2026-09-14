import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LANDING_URL } from '../../constants/urls';

/** En app.* redirige /demo y /llamada al dominio de la landing (timecor.es). */
const RedirectToLandingCampaign = () => {
  const location = useLocation();

  useEffect(() => {
    window.location.replace(`${LANDING_URL}${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  return null;
};

export default RedirectToLandingCampaign;
