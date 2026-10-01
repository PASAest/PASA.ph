import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { Text } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, font } from '@/theme';

// 0 · Splash: logo and tagline, then route to Welcome or Home.
export default function Splash() {
  const { session, loading } = useAuth();
  const [done, setDone] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const t = setTimeout(() => setDone(true), 1800);
    return () => clearTimeout(t);
  }, [fade]);

  if (done && !loading) return <Redirect href={session ? '/(tabs)' : '/welcome'} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Animated.View style={{ opacity: fade, alignItems: 'center', gap: 12, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
        <Mascot size={150} waving />
        <Text style={{ fontFamily: font.black, fontSize: 44, color: colors.primaryDark, letterSpacing: 3 }}>PASA</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.muted }}>
          Turn Potential Into <Text style={{ fontFamily: font.black, color: colors.primary }}>PASA</Text>bilities
        </Text>
      </Animated.View>
    </View>
  );
}
