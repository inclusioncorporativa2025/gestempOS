import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ClockCircleOutlined } from '@ant-design/icons';

const FLIGHT_MS = 1800;
const IDLE_MS = 4600;
const SWAP_AT = 0.92;

const FLIGHT_KEYFRAMES = [
  { transform: 'translate3d(42%, -32%, 0) scale(0.13)' },
  { transform: 'translate3d(6%, -46%, 0) scale(0.22)', offset: 0.34 },
  { transform: 'translate3d(-15%, -14%, 0) scale(0.48)', offset: 0.64 },
  { transform: 'translate3d(-2%, -2%, 0) scale(0.9)', offset: 0.9 },
  { transform: 'translate3d(0, 0, 0) scale(1)' },
];

const FLIGHT_OPTIONS = {
  duration: FLIGHT_MS,
  easing: 'cubic-bezier(0.45, 0, 0.15, 1)',
  fill: 'forwards',
};

const LandingHeroVisual = ({ images = [] }) => {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isFlying, setIsFlying] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const displayRef = useRef(0);
  const mainImgRef = useRef(null);
  const flyerRef = useRef(null);
  const flyerImgRef = useRef(null);
  const animRef = useRef(null);
  const idleTimerRef = useRef(null);
  const swapTimerRef = useRef(null);
  const isFlyingRef = useRef(false);

  useEffect(() => {
    displayRef.current = displayIndex;
  }, [displayIndex]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (swapTimerRef.current) {
      clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
  }, []);

  const resetFlyer = useCallback(() => {
    const flyer = flyerRef.current;
    if (!flyer) return;

    animRef.current?.cancel();
    animRef.current = null;
    flyer.style.opacity = '0';
    flyer.style.transform = FLIGHT_KEYFRAMES[0].transform;
  }, []);

  const applyDisplayImage = useCallback((index) => {
    const image = images[index];
    if (!image) return;

    displayRef.current = index;
    setDisplayIndex(index);

    const mainImg = mainImgRef.current;
    if (mainImg) {
      mainImg.src = image.src;
      mainImg.alt = image.alt;
    }
  }, [images]);

  const scheduleNext = useCallback(() => {
    clearTimers();
    idleTimerRef.current = setTimeout(() => {
      runFlightRef.current?.();
    }, IDLE_MS);
  }, [clearTimers]);

  const runFlightRef = useRef(null);

  const runFlight = useCallback(() => {
    if (reduceMotion || images.length <= 1 || isFlyingRef.current) return;

    const flyer = flyerRef.current;
    const flyerImg = flyerImgRef.current;
    if (!flyer || !flyerImg) return;

    const next = (displayRef.current + 1) % images.length;
    const nextImage = images[next];
    if (!nextImage) return;

    isFlyingRef.current = true;
    setIsFlying(true);
    clearTimers();
    animRef.current?.cancel();

    flyerImg.src = nextImage.src;
    flyer.style.opacity = '1';
    flyer.style.transform = FLIGHT_KEYFRAMES[0].transform;

    const anim = flyer.animate(FLIGHT_KEYFRAMES, FLIGHT_OPTIONS);
    animRef.current = anim;

    swapTimerRef.current = setTimeout(() => {
      applyDisplayImage(next);
    }, FLIGHT_MS * SWAP_AT);

    anim.onfinish = () => {
      applyDisplayImage(next);
      resetFlyer();
      isFlyingRef.current = false;
      setIsFlying(false);
      scheduleNext();
    };

    anim.oncancel = () => {
      isFlyingRef.current = false;
      setIsFlying(false);
    };
  }, [applyDisplayImage, clearTimers, images, reduceMotion, resetFlyer, scheduleNext]);

  runFlightRef.current = runFlight;

  useEffect(() => {
    images.forEach((image) => {
      const preload = new Image();
      preload.src = image.src;
    });
  }, [images]);

  useEffect(() => {
    if (reduceMotion || images.length <= 1) {
      clearTimers();
      animRef.current?.cancel();
      resetFlyer();
      isFlyingRef.current = false;
      setIsFlying(false);
      return undefined;
    }

    scheduleNext();

    return () => {
      clearTimers();
      animRef.current?.cancel();
      isFlyingRef.current = false;
    };
  }, [clearTimers, images.length, reduceMotion, resetFlyer, scheduleNext]);

  if (!images.length) {
    return (
      <div className="landing-hero-visual">
        <article className="landing-hero-card">
          <div className="landing-hero-card-media">
            <div className="landing-hero-card-placeholder">
              <ClockCircleOutlined className="landing-hero-card-placeholder-icon" />
              <span className="landing-hero-card-placeholder-label">
                Imagen del producto
              </span>
            </div>
          </div>
        </article>
      </div>
    );
  }

  if (reduceMotion || images.length === 1) {
    const image = images[0];
    return (
      <div className="landing-hero-visual">
        <article className="landing-hero-card landing-hero-card--stack">
          <div className="landing-hero-stage landing-hero-stage--static">
            <div className="landing-hero-slide landing-hero-slide--main">
              <img
                src={image.src}
                alt={image.alt}
                className="landing-hero-card-img"
                draggable={false}
              />
            </div>
          </div>
        </article>
      </div>
    );
  }

  const displayImage = images[displayIndex];

  return (
    <div className="landing-hero-visual">
      <article className="landing-hero-card landing-hero-card--stack">
        <div
          className="landing-hero-stage"
          aria-live="polite"
          aria-label="Capturas de la aplicación Timecor"
        >
          <div
            className={`landing-hero-slide landing-hero-slide--main${
              isFlying ? ' landing-hero-slide--main-dimmed' : ''
            }`}
          >
            <img
              ref={mainImgRef}
              src={displayImage.src}
              alt={isFlying ? '' : displayImage.alt}
              className="landing-hero-card-img"
              draggable={false}
              aria-hidden={isFlying}
            />
          </div>

          <div
            ref={flyerRef}
            className="landing-hero-slide landing-hero-slide--flyer"
            aria-hidden
          >
            <img
              ref={flyerImgRef}
              src={displayImage.src}
              alt=""
              className="landing-hero-card-img"
              draggable={false}
            />
          </div>
        </div>
      </article>
    </div>
  );
};

export default LandingHeroVisual;
