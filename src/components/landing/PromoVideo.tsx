import { useVideoPlayer, VideoView } from 'expo-video';

// Native fallback (the landing page is meant for the web, but the route exists in the app too).
const SOURCE = 'https://pasa.vercel.app/media/pasa-promo.mp4';

export function PromoVideo() {
  const player = useVideoPlayer(SOURCE);
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls contentFit="cover" />;
}
