import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/Logo';
import { Button, Text } from '@/components/ui';
import { centered } from '@/lib/layout';
import { colors, font, space } from '@/theme';

// 1 · Welcome: Sign Up on top, Log In below.
export default function Welcome() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: space(6), paddingBottom: insets.bottom + space(6) }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Logo size={130} />
        <Text style={{ fontFamily: font.black, fontSize: 44, color: colors.primaryDark, letterSpacing: 3 }}>PASA</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.muted, textAlign: 'center' }}>
          Turn Potential Into <Text style={{ fontFamily: font.black, color: colors.primary }}>PASA</Text>bilities
        </Text>
        <Text variant="muted" style={{ textAlign: 'center', marginTop: 12, maxWidth: 300 }}>
          Find a tutor, share what you know, and trade academic items with fellow college students in Santa Rosa.
        </Text>
      </View>
      <View style={[centered(440), { gap: space(3) }]}>
        <Button title="Sign Up" onPress={() => router.push('/sign-up')} />
        <Button title="Log In" variant="outline" onPress={() => router.push('/log-in')} />
      </View>
    </View>
  );
}
