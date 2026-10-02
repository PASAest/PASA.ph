import { Ionicons } from '@expo/vector-icons';
import { createElement, useCallback, useState } from 'react';
import { PixelRatio, Pressable, Text, useWindowDimensions, View } from 'react-native';

// Web: starts on its own, looped. Browsers only allow autoplay while muted, so a "Tap for sound" button
// turns the soundtrack on. It plays whenever it's on screen and pauses when scrolled away.
const VIDEO_ID = 'pasa-promo-video';

export function PromoVideo() {
  // Sharp 1080p (12 MB) when the video is shown wide or on a high-density screen; 720p (3 MB) on small phones.
  const { width } = useWindowDimensions();
  const src = width * PixelRatio.get() >= 1100 && width >= 600 ? '/media/pasa-promo-1080.mp4' : '/media/pasa-promo-720.mp4';
  const [muted, setMuted] = useState(true);

  const attach = useCallback((v: HTMLVideoElement | null) => {
    if (!v) return;
    v.muted = true;
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

  const toggleSound = () => {
    const v = document.getElementById(VIDEO_ID) as HTMLVideoElement | null;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    if (!next) {
      v.volume = 1;
      if (v.currentTime > 30) v.currentTime = 0; // start from the top when turning sound on near the end
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
        autoPlay: true,
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
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 9,
          paddingHorizontal: 14,
          borderRadius: 999,
          backgroundColor: hovered ? 'rgba(6,13,21,0.85)' : 'rgba(6,13,21,0.7)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{muted ? 'Tap for sound' : 'Sound on'}</Text>
      </Pressable>
    </View>
  );
}
