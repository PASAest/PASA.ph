import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, View } from 'react-native';
import { colors } from '@/theme';

/** A photo or video inside a chat bubble. Photos open full screen; videos play inline with controls. */
export function ChatMedia({ url, type }: { url?: string; type: 'image' | 'video' }) {
  const [full, setFull] = useState(false);
  if (!url) {
    return (
      <View style={{ width: 220, height: 160, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (type === 'video') return <ChatVideo url={url} />;
  return (
    <>
      <Pressable onPress={() => setFull(true)} accessibilityLabel="Open photo">
        <Image source={{ uri: url }} style={{ width: 220, height: 220, borderRadius: 12 }} resizeMode="cover" />
      </Pressable>
      <Modal visible={full} transparent animationType="fade" onRequestClose={() => setFull(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center' }} onPress={() => setFull(false)}>
          <Image source={{ uri: url }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          <View style={{ position: 'absolute', top: 48, right: 20 }}>
            <Ionicons name="close" size={30} color="white" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function ChatVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  return <VideoView player={player} style={{ width: 240, height: 180, borderRadius: 12, backgroundColor: 'black' }} nativeControls contentFit="contain" />;
}
