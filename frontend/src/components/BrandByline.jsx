import React from 'react';
import { BRAND_NAME, BRAND_COMPANY_NAME, BRAND_COMPANY_URL } from '../constants/brand';
import './BrandByline.css';

const BrandByline = ({ className = '', linkClassName = 'brand-byline-link' }) => (
  <span className={className}>
    {BRAND_NAME} by{' '}
    <a
      href={BRAND_COMPANY_URL}
      className={linkClassName}
      target="_blank"
      rel="noopener noreferrer"
    >
      {BRAND_COMPANY_NAME}
    </a>
  </span>
);

export default BrandByline;
