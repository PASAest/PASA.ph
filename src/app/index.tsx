import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/ui';
import { isInstalledApp } from '@/lib/appMode';
import { useAuth } from '@/lib/auth';
import { colors, font } from '@/theme';

// 0 · Splash: logo and tagline, then route to Home (signed in), Log in (inside the app) or the landing page (browser).
export default function Splash() {
  const { session, loading } = useAuth();
  const [done, setDone] = useState(false);
  const [fade] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const t = setTimeout(() => setDone(true), 1800);
    return () => clearTimeout(t);
  }, [fade]);

  // Browser visitors who aren't signed in see the landing page; the app (and the home-screen web app) opens on Log in.
  if (done && !loading) {
    if (session) return <Redirect href="/(tabs)" />;
    if (!isInstalledApp()) return <Redirect href="/landing" />;
    // Web: a normal page load, because in-app navigation into the sign-in screens can show Welcome instead of Log in.
    if (Platform.OS === 'web') {
      window.location.replace('/log-in');
      return null;
    }
    return <Redirect href="/log-in" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Animated.View style={{ opacity: fade, alignItems: 'center', gap: 12, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }}>
        <Logo size={120} />
        <Text style={{ fontFamily: font.black, fontSize: 44, color: colors.primaryDark, letterSpacing: 3 }}>PASA</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.muted }}>
          Turn Potential Into <Text style={{ fontFamily: font.black, color: colors.primary }}>PASA</Text>bilities
        </Text>
      </Animated.View>
    </View>
  );
}
