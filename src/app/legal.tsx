import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { DARK, HEADING_FONT, LIGHT } from '@/components/landing/palette';
import { Logo } from '@/components/Logo';
import { Text } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { termsSections } from '@/lib/terms';
import { useTheme } from '@/lib/themeMode';
import { font, setBrowserBarColor } from '@/theme';

// Website version of the terms, in the landing page's look, so visitors reading it stay on the website.
// (Inside the app, Settings opens /terms instead.)
export default function Legal() {
  const { scheme } = useTheme();
  const { settings } = useSettings();
  const { width } = useWindowDimensions();
  const P = scheme === 'dark' ? DARK : LIGHT;
  const wide = width >= 760;
  const pad = wide ? 56 : 20;

  useEffect(() => setBrowserBarColor(P.paper), [P.paper]);

  // A normal page load back to the landing page, like the landing page's own links.
  const home = () => (Platform.OS === 'web' ? window.location.assign('/landing') : router.replace('/landing'));
  const section = { width: '100%', maxWidth: 820, paddingHorizontal: pad, alignSelf: 'center' } as const;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.paper }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={[section, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 22 }]}>
        <Pressable onPress={home} accessibilityRole="link" accessibilityLabel="PASA home" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo size={34} variant={scheme} />
          <Text style={{ fontFamily: HEADING_FONT, fontSize: 24, color: P.ink }}>PASA</Text>
        </Pressable>
        <Pressable onPress={home} accessibilityRole="link" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="arrow-back" size={16} color={P.blue} />
          <Text style={{ color: P.blue, fontFamily: font.bold, fontSize: 15 }}>Back to home</Text>
        </Pressable>
      </View>

      <View style={[section, { marginTop: wide ? 40 : 16, gap: 14 }]}>
        <Text style={{ color: P.blue, fontFamily: font.bold, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.2 }}>Legal</Text>
        <Text style={{ fontFamily: HEADING_FONT, color: P.ink, fontSize: wide ? 52 : 38, lineHeight: wide ? 58 : 44, letterSpacing: -1.2 }}>
          Terms, community rules & privacy
        </Text>
        <Text style={{ color: P.ink2, fontSize: 18, lineHeight: 28, maxWidth: 620 }}>
          The rules everyone on PASA agrees to, and how we look after your information.
        </Text>
      </View>

      <View style={[section, { marginTop: 36 }]}>
        {termsSections(settings.commission_rate).map(([title, body], i) => (
          <View
            key={title}
            style={{ flexDirection: wide ? 'row' : 'column', gap: wide ? 28 : 8, paddingVertical: 24, borderTopWidth: 1, borderTopColor: P.rule }}
          >
            <View style={{ flexDirection: 'row', gap: 12, width: wide ? 240 : undefined }}>
              <Text style={{ fontFamily: HEADING_FONT, color: P.blue, fontSize: 18 }}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={{ fontFamily: font.bold, color: P.ink, fontSize: 18, flex: 1 }}>{title}</Text>
            </View>
            <Text style={{ flex: 1, color: P.ink2, fontSize: 16.5, lineHeight: 26 }}>{body}</Text>
          </View>
        ))}
      </View>

      <View style={[section, { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 40, borderTopWidth: 1, borderTopColor: P.rule, marginTop: 20 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo size={26} variant={scheme} />
          <Text style={{ color: P.muted }}>© {new Date().getFullYear()} PASA · Turn Potential Into PASAbilities</Text>
        </View>
        <Text onPress={home} style={{ color: P.ink2, fontSize: 14.5 }}>
          Home
        </Text>
      </View>
    </ScrollView>
  );
}
