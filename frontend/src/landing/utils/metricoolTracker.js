const METRICOOL_HASH = '387d7add68e24a72746948872545a454';

let initialized = false;

/** Carga el tracker de Metricool (solo debe llamarse en la web pública). */
export const initMetricoolTracker = () => {
  if (initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;

  const startTracking = () => {
    if (window.beTracker?.t) {
      window.beTracker.t({ hash: METRICOOL_HASH });
    }
  };

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://tracker.metricool.com/resources/be.js';
  script.onload = startTracking;
  script.onreadystatechange = startTracking;
  document.head.appendChild(script);
};
