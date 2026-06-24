import { BRAND_NAME, LOGO_SRC } from '../constants/brand';
import './BrandLogo.css';

const BrandLogo = ({ className = '', variant = 'default' }) => (
  <img
    src={LOGO_SRC}
    alt={BRAND_NAME}
    className={['brand-logo', variant !== 'default' ? `brand-logo--${variant}` : '', className]
      .filter(Boolean)
      .join(' ')}
  />
);

export default BrandLogo;
