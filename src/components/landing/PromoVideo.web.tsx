import { Ionicons } from '@expo/vector-icons';
import { createElement, useCallback, useState } from 'react';
import { PixelRatio, Pressable, useWindowDimensions, View } from 'react-native';

// Web: starts on its own, looped, with sound. Browsers block sound on autoplay until the visitor has interacted
// with the page, so when that happens the video plays muted and its sound comes on at the visitor's first
// tap, click or key press anywhere on the page. It plays whenever it's on screen and pauses when scrolled away.
const VIDEO_ID = 'pasa-promo-video';
const ACTIVATION_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const;
// Set once the visitor mutes on purpose, so the video never turns its sound back on by itself (one video per page).
let chosenMute = false;

export function PromoVideo() {
  // Sharp 1080p (12 MB) when the video is shown wide or on a high-density screen; 720p (3 MB) on small phones.
  const { width } = useWindowDimensions();
  const src = width * PixelRatio.get() >= 1100 && width >= 600 ? '/media/pasa-promo-1080.mp4' : '/media/pasa-promo-720.mp4';
  const [muted, setMuted] = useState(true);

  const attach = useCallback((v: HTMLVideoElement | null) => {
    if (!v) return;

    const unmuteOnFirstInteraction = () => {
      const unmute = () => {
        ACTIVATION_EVENTS.forEach((e) => document.removeEventListener(e, unmute, true));
        if (chosenMute) return;
        v.muted = false;
        setMuted(false);
        if (v.paused && isVisible) v.play().catch(() => {});
      };
      ACTIVATION_EVENTS.forEach((e) => document.addEventListener(e, unmute, { capture: true }));
    };

    // Try with sound first; if the browser refuses, play muted and wait for the first interaction.
    let triedSound = false;
    let isVisible = false;
    const start = () => {
      if (triedSound || chosenMute) return v.play().catch(() => {});
      triedSound = true;
      v.muted = false;
      v.play()
        .then(() => setMuted(false))
        .catch(() => {
          v.muted = true;
          setMuted(true);
          v.play().catch(() => {});
          unmuteOnFirstInteraction();
        });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (entry.isIntersecting) start();
        else v.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(v);
    return () => observer.disconnect();
  }, []);

  const toggleSound = () => {
    const v = document.getElementById(VIDEO_ID) as HTMLVideoElement | null;
    if (!v) return;
    const next = !v.muted;
    chosenMute = next;
    v.muted = next;
    if (!next) {
      v.volume = 1;
      v.play().catch(() => {});
    }
    setMuted(next);
  };

  return (
    <View style={{ width: '100%', height: '100%' }}>
      {createElement('video', {
        ref: attach,
        id: VIDEO_ID,
        src,
        poster: '/media/pasa-promo-poster.jpg',
        muted: true,
        loop: true,
        playsInline: true,
        preload: 'auto',
        disablePictureInPicture: true,
        style: { width: '100%', height: '100%', display: 'block', objectFit: 'cover', backgroundColor: '#0B1520' },
        'aria-label': 'PASA promo video',
      })}
      <Pressable
        onPress={toggleSound}
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Turn sound on' : 'Mute'}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
          position: 'absolute',
          right: 16,
          bottom: 16,
          width: 42,
          height: 42,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 21,
          backgroundColor: hovered ? 'rgba(6,13,21,0.85)' : 'rgba(6,13,21,0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={19} color="#fff" />
      </Pressable>
    </View>
  );
}
