import React, { forwardRef, useEffect, useRef, useState } from 'react';
import './LandingReveal.css';

const LandingReveal = forwardRef(({
  as: Component = 'div',
  children,
  className = '',
  delay = 0,
  ...rest
}, forwardedRef) => {
  const localRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const setRef = (node) => {
    localRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      setVisible(true);
      return undefined;
    }

    const node = localRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -5% 0px',
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const classes = [
    'landing-reveal',
    visible ? 'landing-reveal--visible' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <Component
      ref={setRef}
      className={classes}
      style={{ '--landing-reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Component>
  );
});

LandingReveal.displayName = 'LandingReveal';

export default LandingReveal;
