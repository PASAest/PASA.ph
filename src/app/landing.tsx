import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Logo } from '@/components/Logo';
import { Mascot } from '@/components/Mascot';
import { Button, Card, Text, type IconName } from '@/components/ui';
import { ANDROID_APK_URL, CONTACT_EMAIL, FACEBOOK_URL, SCHOOLS } from '@/config';
import { useAuth } from '@/lib/auth';
import { peso } from '@/lib/format';
import { useSettings } from '@/lib/settings';
import { colors, font, radius, space, themed } from '@/theme';

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'school-outline', title: 'Find a tutor', body: 'Book verified student tutors online (Zoom, Google Meet, MS Teams) or in person.' },
  { icon: 'library-outline', title: 'Buy, sell & rent', body: 'Books, calculators, lab and drafting tools, uniforms and more, from students near you.' },
  { icon: 'shield-checkmark-outline', title: 'Students only', body: 'Everyone is verified with a school ID and COR. Tutors also submit a CV.' },
  { icon: 'wallet-outline', title: 'Safe payments', body: 'Pay with GCash or Maya. PASA holds the money until the session happens or the item arrives.' },
];

const STEPS = [
  ['Sign up & verify', 'Create an account and upload your school ID and COR.'],
  ['Find what you need', 'Post what you need help with, browse tutors, or search Assets.'],
  ['Pay safely', 'Pay through GCash or Maya. Confirm when done and rate each other.'],
];

// Landing page (web): what PASA is, for students visiting the link before signing in.
export default function Landing() {
  const { session } = useAuth();
  const { settings } = useSettings();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  if (session) return <Redirect href="/(tabs)" />;

  const start = () => router.push('/welcome');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ alignItems: 'center' }}>
      <View style={[styles.page, { paddingHorizontal: wide ? space(10) : space(5) }]}>
        {/* Nav */}
        <View style={styles.nav}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo size={38} />
            <Text style={{ fontFamily: font.black, fontSize: 22, color: colors.primaryDark, letterSpacing: 1 }}>PASA</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Log in" variant="ghost" small onPress={() => router.push('/log-in')} />
            <Button title="Get started" small onPress={start} />
          </View>
        </View>

        {/* Hero */}
        <View style={[styles.hero, { flexDirection: wide ? 'row' : 'column' }]}>
          <View style={{ flex: 1, gap: space(4) }}>
            <Text style={[styles.h1, { fontSize: wide ? 52 : 38, lineHeight: wide ? 60 : 46 }]}>
              Turn Potential Into <Text style={[styles.h1, { fontSize: wide ? 52 : 38, color: colors.primary }]}>PASA</Text>bilities
            </Text>
            <Text style={{ fontSize: 18, lineHeight: 27, color: colors.muted }}>
              The student marketplace for college students in Santa Rosa, Laguna. Get help from fellow students, share what you know, and trade academic items, safely.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              <Button title="Open PASA" icon="arrow-forward" onPress={start} />
              {!!ANDROID_APK_URL && <Button title="Get the Android app" icon="logo-android" variant="outline" onPress={() => Linking.openURL(ANDROID_APK_URL)} />}
            </View>
          </View>
          <View style={styles.heroArt}>
            <Mascot size={wide ? 220 : 170} waving />
          </View>
        </View>

        {/* Features */}
        <Section title="Everything students need, in one app">
          <Grid wide={wide}>
            {FEATURES.map((f) => (
              <Card key={f.title} style={styles.feature}>
                <View style={styles.iconBox}>
                  <Ionicons name={f.icon} size={24} color={colors.primary} />
                </View>
                <Text variant="title">{f.title}</Text>
                <Text variant="muted" style={{ lineHeight: 20 }}>
                  {f.body}
                </Text>
              </Card>
            ))}
          </Grid>
        </Section>

        {/* How it works */}
        <Section title="How it works">
          <Grid wide={wide}>
            {STEPS.map(([title, body], i) => (
              <Card key={title} style={styles.feature}>
                <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontFamily: font.black, color: colors.white, fontSize: 18 }}>{i + 1}</Text>
                </View>
                <Text variant="title">{title}</Text>
                <Text variant="muted">{body}</Text>
              </Card>
            ))}
          </Grid>
        </Section>

        {/* Tutors + Plus */}
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: space(4), marginTop: space(10) }}>
          <Card style={[styles.band, { flex: 1 }]}>
            <Text variant="h2">Good at a subject? Tutor and earn.</Text>
            <Text variant="muted" style={{ lineHeight: 21 }}>
              Set your own rate (from {peso(settings.min_tutor_rate)}/hour), tutor online or in person, and withdraw your earnings to GCash or Maya.
            </Text>
            <Button title="Become a tutor" variant="outline" small onPress={start} style={{ alignSelf: 'flex-start' }} />
          </Card>
          <Card style={[styles.band, { flex: 1, backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }]}>
            <Text variant="h2">PASA Plus</Text>
            <Text variant="muted" style={{ lineHeight: 21 }}>
              {settings.plus_boosts} boosts a month, a {settings.plus_discount}% lower service fee and a Plus badge. First month free, then from {peso(settings.plus_price_1m)}/month.
            </Text>
          </Card>
        </View>

        {/* Schools */}
        <Section title="For students of">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SCHOOLS.filter((s) => s !== 'Other').map((s) => (
              <View key={s} style={styles.school}>
                <Text style={{ fontFamily: font.semibold, color: colors.primaryDark }}>{s}</Text>
              </View>
            ))}
            <View style={styles.school}>
              <Text style={{ fontFamily: font.semibold, color: colors.primaryDark }}>…and other colleges in Santa Rosa</Text>
            </View>
          </View>
        </Section>

        {/* CTA */}
        <Card style={[styles.band, { marginTop: space(10), alignItems: 'center', backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Text style={{ fontFamily: font.black, fontSize: 26, color: colors.white, textAlign: 'center' }}>Ready to pass it on?</Text>
          <Button title="Create your free account" variant="outline" onPress={start} style={{ backgroundColor: colors.surface, borderColor: colors.surface }} />
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text variant="muted">© {new Date().getFullYear()} PASA · Turn Potential Into PASAbilities</Text>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <Text variant="muted" onPress={() => router.push('/terms')} style={{ textDecorationLine: 'underline' }}>
              Terms & privacy
            </Text>
            {!!FACEBOOK_URL && (
              <Text variant="muted" onPress={() => Linking.openURL(FACEBOOK_URL)} style={{ textDecorationLine: 'underline' }}>
                Facebook
              </Text>
            )}
            {!!CONTACT_EMAIL && (
              <Text variant="muted" onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} style={{ textDecorationLine: 'underline' }}>
                {CONTACT_EMAIL}
              </Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: space(12), gap: space(5) }}>
      <Text variant="h2" style={{ fontSize: 28, lineHeight: 34 }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Grid({ wide, children }: { wide: boolean; children: ReactNode }) {
  return <View style={{ flexDirection: wide ? 'row' : 'column', flexWrap: 'wrap', gap: space(4) }}>{children}</View>;
}

const styles = themed(() =>
  StyleSheet.create({
    page: { width: '100%', maxWidth: 1180, paddingBottom: space(10) },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(5) },
    hero: { alignItems: 'center', gap: space(8), marginTop: space(8) },
    h1: { fontFamily: font.black, color: colors.text },
    heroArt: { width: 300, height: 300, borderRadius: 150, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
    feature: { flexGrow: 1, flexBasis: 240, gap: 8 },
    iconBox: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    band: { gap: space(3), padding: space(6) },
    school: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.brandSoft },
    footer: { marginTop: space(10), paddingTop: space(5), borderTopWidth: 1, borderTopColor: colors.border, gap: 8 },
  }),
);
