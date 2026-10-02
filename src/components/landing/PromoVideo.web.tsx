import { createElement } from 'react';

// Web: a native <video> so the browser handles controls, sound and fullscreen.
export function PromoVideo() {
  return createElement('video', {
    src: '/media/pasa-promo.mp4',
    poster: '/media/pasa-promo-poster.jpg',
    controls: true,
    playsInline: true,
    preload: 'metadata',
    style: { width: '100%', height: '100%', display: 'block', objectFit: 'cover', backgroundColor: '#0B1520' },
    'aria-label': 'PASA promo video',
  });
}
