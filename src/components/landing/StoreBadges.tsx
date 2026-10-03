import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/config';
import { font } from '@/theme';

/** "Get it on Google Play" / "Download on the App Store" badges that open the stores. */
export function StoreBadges() {
  return (
    <View style={styles.row}>
      <Badge url={PLAY_STORE_URL} label="Get it on Google Play" top="GET IT ON" bottom="Google Play" icon={<PlayIcon />} />
      <Badge url={APP_STORE_URL} label="Download on the App Store" top="Download on the" bottom="App Store" icon={<Ionicons name="logo-apple" size={30} color="#fff" />} />
    </View>
  );
}

function Badge({ url, label, top, bottom, icon }: { url: string; label: string; top: string; bottom: string; icon: React.ReactNode }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.badge, (pressed || hovered) && { backgroundColor: '#1A1A1A' }]}
    >
      <View style={styles.icon}>{icon}</View>
      <View>
        <Text style={styles.top}>{top}</Text>
        <Text style={styles.bottom}>{bottom}</Text>
      </View>
    </Pressable>
  );
}

/** The four-colour Play triangle. */
function PlayIcon() {
  return (
    <Svg width={26} height={28} viewBox="0 0 24 26">
      <Path d="M1 1.2 L13.2 13 L1 24.8 C0.6 24.5 0.4 24 0.4 23.4 V2.6 C0.4 2 0.6 1.5 1 1.2 Z" fill="#4285F4" />
      <Path d="M1 1.2 C1.4 0.9 2 0.8 2.6 1.1 L16.9 9.2 L13.2 13 Z" fill="#34A853" />
      <Path d="M16.9 9.2 L21.4 11.8 C22.6 12.5 22.6 13.5 21.4 14.2 L16.9 16.8 L13.2 13 Z" fill="#FBBC04" />
      <Path d="M13.2 13 L16.9 16.8 L2.6 24.9 C2 25.2 1.4 25.1 1 24.8 Z" fill="#EA4335" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    minWidth: 180,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: 12,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#A6A6A6',
  },
  icon: { width: 30, alignItems: 'center' },
  top: { color: '#fff', fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.3 },
  bottom: { color: '#fff', fontFamily: font.bold, fontSize: 19, lineHeight: 22, marginTop: -1 },
});
