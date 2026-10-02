import { createElement, useCallback } from 'react';

// Web: plays on its own, looped, muted (browsers only allow autoplay when muted), with no controls.
// Browsers pause off-screen videos, so play whenever it's visible and pause when it isn't.
export function PromoVideo() {
  const attach = useCallback((v: HTMLVideoElement | null) => {
    if (!v) return;
    v.muted = true; // set the property too; React doesn't always reflect the `muted` attribute
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(v);
    return () => observer.disconnect();
  }, []);

  return createElement('video', {
    ref: attach,
    src: '/media/pasa-promo.mp4',
    poster: '/media/pasa-promo-poster.jpg',
    autoPlay: true,
    muted: true,
    loop: true,
    playsInline: true,
    preload: 'auto',
    disablePictureInPicture: true,
    style: { width: '100%', height: '100%', display: 'block', objectFit: 'cover', backgroundColor: '#0B1520', pointerEvents: 'none' },
    'aria-label': 'PASA promo video',
  });
}
