import { useVideoPlayer, VideoView } from 'expo-video';

// Native fallback (the landing page is meant for the web, but the route exists in the app too). Apps may autoplay with sound.
const SOURCE = 'https://pasaph.vercel.app/media/pasa-promo-720.mp4';

export function PromoVideo() {
  const player = useVideoPlayer(SOURCE, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls={false} contentFit="cover" />;
}
