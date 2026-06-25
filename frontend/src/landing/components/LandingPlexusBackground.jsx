import React, { useRef } from 'react';
import { useLandingPlexus } from '../hooks/useLandingPlexus';

const LandingPlexusBackground = () => {
  const canvasRef = useRef(null);

  useLandingPlexus(canvasRef);

  return (
    <canvas
      ref={canvasRef}
      className="landing-plexus-bg"
      aria-hidden
    />
  );
};

export default LandingPlexusBackground;
