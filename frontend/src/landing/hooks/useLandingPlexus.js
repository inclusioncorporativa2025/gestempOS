import { useEffect } from 'react';

const DEG_TO_RAD = Math.PI / 180;

const degToRad = (deg) => deg * DEG_TO_RAD;

function createDot(id, x, y, options) {
  const {
    maxDistFromCursor,
    linkDistance,
  } = options;

  const angle = Math.floor(Math.random() * 140) + 200;
  const jitterX = (Math.random() > 0.5 ? 1 : -1)
    * (Math.floor(Math.random() * maxDistFromCursor) + 1);
  const jitterY = (Math.random() > 0.5 ? 1 : -1)
    * (Math.floor(Math.random() * maxDistFromCursor) + 1);

  return {
    id,
    x: x + jitterX,
    y: y + jitterY,
    r: Math.floor(Math.random() * 2) + 1.5,
    dir: angle,
    speed: 0.35 + Math.random() * 0.25,
    alpha: 0.45 + Math.random() * 0.35,
    alphaReduction: 0.004 + Math.random() * 0.003,
    linkDistance,
  };
}

function drawDot(ctx, dot) {
  ctx.fillStyle = `rgba(199, 139, 240, ${dot.alpha})`;
  ctx.shadowColor = 'rgba(168, 92, 224, 0.85)';
  ctx.shadowBlur = dot.r * 3;
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTrailLink(ctx, dot, previousDot) {
  if (!previousDot) return;
  const opacity = Math.min(dot.alpha, previousDot.alpha) * 0.35;
  ctx.strokeStyle = `rgba(199, 139, 240, ${opacity})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(previousDot.x, previousDot.y);
  ctx.lineTo(dot.x, dot.y);
  ctx.stroke();
}

function drawProximityLinks(ctx, dots, maxDistance) {
  ctx.shadowBlur = 0;
  for (let i = 0; i < dots.length; i += 1) {
    for (let j = i + 1; j < dots.length; j += 1) {
      const a = dots[i];
      const b = dots[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist > maxDistance) continue;

      const opacity = (1 - dist / maxDistance) * Math.min(a.alpha, b.alpha) * 0.55;
      ctx.strokeStyle = `rgba(168, 92, 224, ${opacity})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

/**
 * Red plexus a pantalla completa al mover el cursor (fondo de la landing).
 */
export function useLandingPlexus(canvasRef, options = {}) {
  const {
    maxDots = 110,
    dotsMinDist = 12,
    maxDistFromCursor = 42,
    linkDistance = 110,
  } = options;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointerCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (prefersReduced || pointerCoarse) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let dots = [];
    let nextId = 0;
    let mouseX = 0;
    let mouseY = 0;
    let mouseMoving = false;
    let mouseMoveTimer = null;
    let rafId = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const getPreviousDot = (index, stepBack) => {
      const previousIndex = index - stepBack;
      if (previousIndex < 0) return null;
      return dots[previousIndex] ?? null;
    };

    const addDotAtCursor = () => {
      if (!mouseMoving || !dots.length) {
        dots.push(createDot(nextId, mouseX, mouseY, { maxDistFromCursor, linkDistance }));
        nextId += 1;
        return;
      }

      const previous = dots[dots.length - 1];
      const diffX = Math.abs(previous.x - mouseX);
      const diffY = Math.abs(previous.y - mouseY);
      if (diffX < dotsMinDist && diffY < dotsMinDist) return;

      dots.push(createDot(nextId, mouseX, mouseY, { maxDistFromCursor, linkDistance }));
      nextId += 1;

      if (dots.length > maxDots) {
        dots = dots.slice(-maxDots);
      }
    };

    const updateDots = () => {
      dots = dots.filter((dot) => {
        dot.alpha -= dot.alphaReduction;
        if (dot.alpha <= 0) return false;

        dot.x += Math.cos(degToRad(dot.dir)) * dot.speed;
        dot.y += Math.sin(degToRad(dot.dir)) * dot.speed;
        return true;
      });
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      drawProximityLinks(ctx, dots, linkDistance);

      dots.forEach((dot, index) => {
        drawTrailLink(ctx, dot, getPreviousDot(index, 1));
        drawTrailLink(ctx, dot, getPreviousDot(index, 2));
        drawDot(ctx, dot);
      });

      ctx.shadowBlur = 0;
    };

    const tick = () => {
      if (mouseMoving) addDotAtCursor();
      updateDots();
      render();
      rafId = requestAnimationFrame(tick);
    };

    const onMove = (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      mouseMoving = true;
      clearTimeout(mouseMoveTimer);
      mouseMoveTimer = setTimeout(() => {
        mouseMoving = false;
      }, 100);
    };

    const onLeave = () => {
      mouseMoving = false;
    };

    resize();
    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
      clearTimeout(mouseMoveTimer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [canvasRef, maxDots, dotsMinDist, maxDistFromCursor, linkDistance]);
}
