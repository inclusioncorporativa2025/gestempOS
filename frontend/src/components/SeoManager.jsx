import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyPageSeo, resolveSeoForPath } from '../utils/seo';

/** Sincroniza metadatos SEO al cambiar de ruta. */
const SeoManager = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    applyPageSeo(resolveSeoForPath(pathname));
  }, [pathname]);

  return null;
};

export default SeoManager;
