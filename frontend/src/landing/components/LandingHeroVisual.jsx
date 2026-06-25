import React from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';

const LandingHeroVisual = ({ imageSrc }) => (
  <div className="landing-hero-visual">
    <article className="landing-hero-card">
      <div className="landing-hero-card-media">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Vista de la aplicación Timecor para control horario"
            className="landing-hero-card-img"
          />
        ) : (
          <div className="landing-hero-card-placeholder">
            <ClockCircleOutlined className="landing-hero-card-placeholder-icon" />
            <span className="landing-hero-card-placeholder-label">
              Imagen del producto
            </span>
          </div>
        )}
      </div>
    </article>
  </div>
);

export default LandingHeroVisual;
