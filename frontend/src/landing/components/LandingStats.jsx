import React, { useEffect, useRef, useState } from 'react';
import './LandingStats.css';

const STATS = [
  { id: 'empresas', value: 53, prefix: '+', label: 'empresas en España' },
  { id: 'usuarios', value: 133, prefix: '+', label: 'usuarios en la plataforma' },
  { id: 'fichajes', value: 8050, prefix: '+', label: 'fichajes registrados' },
];

const formatStatNumber = (value) => value.toLocaleString('es-ES');

const useCountUp = (target, active, { duration = 1400, delay = 0 } = {}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setCount(target);
      return undefined;
    }

    let startTime = null;
    let frameId = null;
    let delayTimer = null;

    const tick = (timestamp) => {
      if (startTime == null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setCount(Math.round(eased * target));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    setCount(0);
    delayTimer = window.setTimeout(() => {
      frameId = requestAnimationFrame(tick);
    }, delay);

    return () => {
      if (delayTimer != null) window.clearTimeout(delayTimer);
      if (frameId != null) cancelAnimationFrame(frameId);
    };
  }, [target, active, duration, delay]);

  return count;
};

const StatItem = ({ value, prefix, label, active, delay = 0 }) => {
  const duration = value >= 1000 ? 2200 : 1400;
  const count = useCountUp(value, active, { duration, delay });

  return (
    <li className="landing-stat-item" style={{ '--landing-stat-delay': `${delay}ms` }}>
      <p
        className="landing-stat-value"
        aria-label={`${prefix}${formatStatNumber(value)} ${label}`}
      >
        <span className="landing-stat-prefix">{prefix}</span>
        <span className="landing-stat-number">{formatStatNumber(count)}</span>
        <span className="landing-stat-label">{label}</span>
      </p>
    </li>
  );
};

const LandingStats = () => {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="landing-stats"
      aria-labelledby="landing-stats-title"
    >
      <div className="landing-container">
        <h2 id="landing-stats-title" className="landing-stats-title">
          Empresas que ya confían en Timecor
        </h2>
        <ul className="landing-stats-grid">
          {STATS.map((stat, index) => (
            <StatItem
              key={stat.id}
              value={stat.value}
              prefix={stat.prefix}
              label={stat.label}
              active={active}
              delay={index * 120}
            />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default LandingStats;
