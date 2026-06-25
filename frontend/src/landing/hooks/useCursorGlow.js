import { useEffect } from 'react';

/**
 * Suaviza el seguimiento del cursor (lerp en rAF), inspirado en el tracking
 * mouseX/mouseY del efecto original — sin canvas ni partículas.
 */
export function useCursorGlow(trackRef, glowRef, options = {}) {
  const {
    smoothness = 0.12,
    idleX = 50,
    idleY = 42,
    positionRef = trackRef,
  } = options;

  useEffect(() => {
    const track = trackRef.current;
    const glow = glowRef.current;
    if (!track || !glow) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointerCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (prefersReduced || pointerCoarse) return undefined;

    const position = { x: idleX, y: idleY };
    const target = { x: idleX, y: idleY };
    let rafId = null;
    let isActive = false;
    let idleTimer = null;

    const getPositionRect = () => {
      const root = positionRef?.current || track;
      return root.getBoundingClientRect();
    };

    const applyPosition = () => {
      glow.style.setProperty('--cursor-x', `${position.x}%`);
      glow.style.setProperty('--cursor-y', `${position.y}%`);
      glow.classList.toggle('landing-hero-visual-glow--active', isActive);
    };

    const tick = () => {
      position.x += (target.x - position.x) * smoothness;
      position.y += (target.y - position.y) * smoothness;
      applyPosition();
      rafId = requestAnimationFrame(tick);
    };

    const setTarget = (clientX, clientY) => {
      const rect = getPositionRect();
      if (!rect.width || !rect.height) return;

      target.x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      target.y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
      isActive = true;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        isActive = false;
        target.x = idleX;
        target.y = idleY;
      }, 120);
    };

    const onMove = (event) => setTarget(event.clientX, event.clientY);

    const onLeave = () => {
      isActive = false;
      target.x = idleX;
      target.y = idleY;
    };

    applyPosition();
    track.addEventListener('mousemove', onMove, { passive: true });
    track.addEventListener('mouseleave', onLeave, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      track.removeEventListener('mousemove', onMove);
      track.removeEventListener('mouseleave', onLeave);
      clearTimeout(idleTimer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [trackRef, glowRef, positionRef, smoothness, idleX, idleY]);
}
