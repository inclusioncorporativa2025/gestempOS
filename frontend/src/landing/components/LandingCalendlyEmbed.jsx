import React, { useEffect, useRef } from 'react';
import { CALENDLY_DEMO_URL, buildCalendlyEmbedUrl } from '../utils/calendly';
import { notifyCalendlyBooking } from '../utils/calendlyLeadNotify';
import './LandingCalendlyEmbed.css';

const CALENDLY_SCRIPT = 'https://assets.calendly.com/assets/external/widget.js';

const loadCalendlyScript = () => new Promise((resolve, reject) => {
  if (window.Calendly) {
    resolve(window.Calendly);
    return;
  }

  const existing = document.querySelector(`script[src="${CALENDLY_SCRIPT}"]`);
  if (existing) {
    existing.addEventListener('load', () => resolve(window.Calendly));
    existing.addEventListener('error', reject);
    return;
  }

  const script = document.createElement('script');
  script.src = CALENDLY_SCRIPT;
  script.async = true;
  script.onload = () => resolve(window.Calendly);
  script.onerror = reject;
  document.head.appendChild(script);
});

const LandingCalendlyEmbed = ({
  url = CALENDLY_DEMO_URL,
  className = '',
  hideDetails = false,
  resize = false,
}) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const onCalendlyMessage = (event) => {
      if (!String(event.origin || '').includes('calendly.com')) return;

      const eventName = event.data?.event;

      if (eventName === 'calendly.page_height' && containerRef.current) {
        const height = Number(event.data.payload?.height);
        if (height > 0) {
          containerRef.current.style.height = `${height}px`;
        }
        return;
      }

      if (eventName !== 'calendly.event_scheduled') return;

      notifyCalendlyBooking({
        invitee: event.data.payload?.invitee,
        event: event.data.payload?.event,
      });
    };

    window.addEventListener('message', onCalendlyMessage);
    return () => window.removeEventListener('message', onCalendlyMessage);
  }, []);

  useEffect(() => {
    if (!resize || !containerRef.current) return undefined;

    const parent = containerRef.current;
    const embedUrl = buildCalendlyEmbedUrl(url, { hideDetails });
    let cancelled = false;

    loadCalendlyScript()
      .then((Calendly) => {
        if (cancelled || !parent) return;
        parent.replaceChildren();
        Calendly.initInlineWidget({
          url: embedUrl,
          parentElement: parent,
          resize: true,
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      parent.replaceChildren();
    };
  }, [url, hideDetails, resize]);

  if (resize) {
    return (
      <div
        ref={containerRef}
        className={`landing-calendly-embed landing-calendly-embed--widget ${className}`.trim()}
      />
    );
  }

  return (
    <div className={`landing-calendly-embed ${className}`.trim()}>
      <iframe
        title="Reservar demo Timecor en Calendly"
        src={buildCalendlyEmbedUrl(url, { hideDetails })}
        className="landing-calendly-embed__iframe"
        loading="lazy"
        allow="fullscreen"
        scrolling="no"
      />
    </div>
  );
};

export default LandingCalendlyEmbed;
