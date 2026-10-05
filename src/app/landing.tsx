import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold, useFonts } from '@expo-google-fonts/bricolage-grotesque';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Linking, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type TextStyle } from 'react-native';
import { Reveal, useCountUp, useReducedMotion, useRevealScroll } from '@/components/landing/Motion';
import { PromoVideo } from '@/components/landing/PromoVideo';
import { StoreBadges } from '@/components/landing/StoreBadges';
import { Logo } from '@/components/Logo';
import { Loading, Text, type IconName } from '@/components/ui';
import { ANDROID_APK_URL, CATEGORIES, CONTACT_EMAIL, FACEBOOK_URL, PROGRAMS, SCHOOLS, SUBJECTS } from '@/config';
import { isInstalledApp } from '@/lib/appMode';
import { useAuth } from '@/lib/auth';
import { peso } from '@/lib/format';
import { PLUS_PLANS, useSettings } from '@/lib/settings';
import { useTheme } from '@/lib/themeMode';
import { font, saveMode, setBrowserBarColor, type Scheme } from '@/theme';
import { DARK, HEADING_FONT, LIGHT } from '@/components/landing/palette';

type Palette = typeof LIGHT;
type ColorKey = Exclude<keyof Palette, 'shadow'>;
const COLOR_KEYS = Object.keys(LIGHT).filter((k) => k !== 'shadow') as ColorKey[];
const INK_ON_LIGHT = '#10283D'; // text on fixed light surfaces (highlighter, pastel avatars)

// On the web every color is a CSS variable (var(--l-paper) …). Switching modes only flips one attribute on the
// page root; the browser animates the variables themselves, so nothing re-renders and the fade starts instantly.
const IS_WEB = Platform.OS === 'web';
const cssVar = (k: string) => `--l-${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
const VARS: Palette = { ...(Object.fromEntries(COLOR_KEYS.map((k) => [k, `var(${cssVar(k)})`])) as Record<ColorKey, string>), shadow: 0.15 };
const FADE_MS = 400;
const THEME_CSS = [
  // Registered as colors so the variables can be transitioned (unsupported browsers just switch instantly).
  ...COLOR_KEYS.map((k) => `@property ${cssVar(k)} { syntax: '<color>'; inherits: true; initial-value: ${LIGHT[k]}; }`),
  `#landing-root { ${COLOR_KEYS.map((k) => `${cssVar(k)}: ${LIGHT[k]};`).join(' ')} }`,
  `#landing-root[data-mode="dark"] { ${COLOR_KEYS.map((k) => `${cssVar(k)}: ${DARK[k]};`).join(' ')} }`,
  `#landing-root[data-ready] { transition: ${COLOR_KEYS.map((k) => `${cssVar(k)} ${FADE_MS}ms ease`).join(', ')}; }`,
  `@media (prefers-reduced-motion: reduce) { #landing-root[data-ready] { transition: none; } }`,
].join('\n');

/** Installs the theme stylesheet once and keeps the root's data-mode attribute in sync (web only). */
function useLandingTheme(mode: Scheme) {
  useLayoutEffect(() => {
    if (!IS_WEB) return;
    if (!document.getElementById('landing-theme')) {
      const tag = document.createElement('style');
      tag.id = 'landing-theme';
      tag.textContent = THEME_CSS;
      document.head.appendChild(tag);
    }
    const root = document.getElementById('landing-root');
    if (!root) return;
    root.setAttribute('data-mode', mode);
    setBrowserBarColor((mode === 'dark' ? DARK : LIGHT).paper);
    // Turn transitions on only after the first paint, so the page doesn't fade in from light on load.
    if (!root.hasAttribute('data-ready')) requestAnimationFrame(() => root.setAttribute('data-ready', ''));
  });
}

const PalCtx = createContext<Palette>(IS_WEB ? VARS : LIGHT);
const usePal = () => useContext(PalCtx);
const useStyles = () => {
  const P = usePal();
  return useMemo(() => makeStyles(P), [P]);
};
const H = HEADING_FONT;
const H7 = 'BricolageGrotesque_700Bold';
const SCHOOL_NAMES = SCHOOLS.filter((s) => s !== 'Other');

const FAQ = [
  ['Who can join PASA?', 'College students in Santa Rosa, Laguna. You sign up with your school, program and year, then upload your school ID and COR. The PASA team checks them before you can book, buy or sell.'],
  ['How do payments work?', 'You pay with GCash or Maya inside the app. PASA holds the money and only releases it to the tutor or seller after you confirm the session happened or you got the item. If it’s cancelled, you’re refunded.'],
  ['How does online tutoring work?', 'Every session is online. You pick Zoom, Google Meet or MS Teams when you book, your tutor sends the meeting link, and you join from your phone or laptop.'],
  ['What does it cost?', 'Signing up is free. A small service fee is added on top of the tutor’s rate or item price at checkout. PASA Plus members pay a lower fee.'],
  ['Can I sell reviewers or answer keys?', 'No. Assets is for books, calculators, supplies, lab and drafting tools, uniforms and gadgets. Listings with photos, and anything that looks like answer keys, exercises or quizzes, are checked by an admin first.'],
  ['How do I become a tutor?', 'Get verified, then apply from your profile with your subjects, rate and CV. Once approved, students can find and book you, and your earnings go to your PASA wallet.'],
];

// Landing page (web): what PASA is, for visitors before they sign in.
export default function Landing() {
  const { session } = useAuth();
  const { settings } = useSettings();
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({ BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold });
  const scroll = useRevealScroll();
  const scrollRef = useRef<ScrollView>(null);
  const anchors = useRef<Record<string, number>>({});
  const theme = useTheme();
  const [mode, setMode] = useState<Scheme>(theme.scheme);
  // Web: palette is CSS variables (constant), so toggling never rebuilds styles. Native: plain colors.
  const P = IS_WEB ? VARS : mode === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => makeStyles(P), [P]);
  useLandingTheme(mode);
  const wide = width >= 980;
  // Tablets (iPad portrait and similar) get their own sizes between the phone and laptop layouts.
  const tablet = !wide && width >= 700;
  const pad = wide ? 56 : tablet ? 40 : 20;

  // The landing page is for browsers only. Inside the app (or the home-screen web app) go straight to the app.
  if (isInstalledApp()) {
    if (IS_WEB && !session) {
      window.location.replace('/log-in'); // full load: in-app navigation into sign-in can show Welcome instead
      return null;
    }
    return <Redirect href={session ? '/(tabs)' : '/log-in'} />;
  }
  if (!fontsLoaded) return <Loading />;

  const toggleMode = () => {
    const next: Scheme = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    saveMode(next); // remembered for next time and for the app
  };
  // Leaving the landing page: bring the app's theme in line with what the visitor picked here.
  // Apply the visitor's choice to the app first (the screens rebuild here, where it already looks right),
  // then navigate once the rebuild has settled.
  // Web: open the page with a normal browser load. In-app navigation from here into the sign-in screens can
  // show the wrong screen (Log in landing on Welcome), and a fresh load also applies the theme picked here.
  const open = (href: '/' | '/welcome' | '/log-in' | '/legal' | '/admin') => {
    if (IS_WEB) {
      window.location.assign(href);
      return;
    }
    if (theme.scheme !== mode) theme.setMode(mode);
    setTimeout(() => router.navigate(href), theme.scheme !== mode ? 200 : 0);
  };
  const start = () => open('/welcome');
  const setAnchor = (key: string, e: { nativeEvent: { layout: { y: number } } }) => {
    anchors.current[key] = e.nativeEvent.layout.y;
  };
  const go = (key: string) => scrollRef.current?.scrollTo({ y: (anchors.current[key] ?? 0) - 20, animated: true });
  const section = { width: '100%', maxWidth: 1220, paddingHorizontal: pad } as const;

  return (
    <PalCtx.Provider value={P}>
    <scroll.Provider value={scroll.value}>
      <ScrollView
        ref={scrollRef}
        nativeID="landing-root"
        style={{ flex: 1, backgroundColor: P.paper }}
        contentContainerStyle={{ alignItems: 'center' }}
        scrollEventThrottle={32}
        onScroll={() => scroll.report(height)}
        onLayout={() => scroll.report(height)}
      >
        {/* Top bar */}
        <View style={[section, styles.nav]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo size={34} variant={mode} />
            <Text style={{ fontFamily: H, fontSize: 24, color: P.ink }}>PASA</Text>
          </View>
          {wide && (
            <View style={{ flexDirection: 'row', gap: 28 }}>
              {[
                ['How it works', 'how'],
                ['Tutors', 'tutors'],
                ['Assets', 'assets'],
                ['FAQ', 'faq'],
              ].map(([label, key]) => (
                <Text key={key} onPress={() => go(key)} style={styles.navLink}>
                  {label}
                </Text>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <ThemeToggle dark={mode === 'dark'} onPress={toggleMode} />
            {session ? (
              <Btn title="Open app" onPress={() => open('/')} small />
            ) : (
              <>
                <Text onPress={() => open('/log-in')} style={styles.navLink}>
                  Log in
                </Text>
                <Btn title="Sign up" onPress={start} small />
              </>
            )}
          </View>
        </View>

        {/* Hero */}
        <View style={[section, styles.hero, { flexDirection: wide ? 'row' : 'column' }]}>
          <View style={{ flex: 1, gap: 22, paddingTop: wide ? 30 : 10 }}>
            <Text style={styles.kicker}>For college students in Santa Rosa, Laguna</Text>
            <Text style={[styles.h1, { fontSize: wide ? 62 : tablet ? 56 : 44, lineHeight: wide ? 66 : tablet ? 60 : 48 }]}>
              Pass the subject.{'\n'}Pass on the book.
            </Text>
            <Text style={{ fontFamily: H7, fontSize: wide ? 26 : tablet ? 24 : 21, color: P.ink }}>
              Turn Potential Into <Text style={{ fontFamily: H7, fontSize: wide ? 26 : tablet ? 24 : 21, color: INK_ON_LIGHT, backgroundColor: P.marker, paddingHorizontal: 4 }}>PASAbilities</Text>.
            </Text>
            <Text style={styles.lead}>
              PASA is where students tutor students and trade the stuff school makes you buy. Book a tutor for an online session, sell or rent your old books and calculators, and pay safely with GCash or Maya.
            </Text>
            <View style={{ flexDirection: 'row', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
              <Btn title="Create a free account" onPress={start} />
              <Pressable onPress={() => go('how')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: P.blue, fontFamily: font.bold, fontSize: 16 }}>See how it works</Text>
                <Ionicons name="arrow-down" size={16} color={P.blue} />
              </Pressable>
              {!!ANDROID_APK_URL && (
                <Pressable onPress={() => Linking.openURL(ANDROID_APK_URL)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="logo-android" size={18} color={P.green} />
                  <Text style={{ color: P.green, fontFamily: font.bold, fontSize: 16 }}>Android app</Text>
                </Pressable>
              )}
            </View>
            <StoreBadges />
          </View>
          <View style={wide ? { width: 520, height: 560 } : tablet ? { width: 520, height: 560, alignSelf: 'center' } : { width: '100%', maxWidth: 420, height: 720, alignSelf: 'center' }}>
            <Board wide={wide || tablet} />
          </View>
        </View>

        {/* Numbers */}
        <View style={[section, { marginTop: wide ? 40 : 30 }]}>
          <View style={[styles.stats, { flexDirection: 'row', flexWrap: 'wrap' }]}>
            <Stat wide={wide || tablet} value={SCHOOL_NAMES.length} label="colleges in Santa Rosa" first />
            <Stat wide={wide || tablet} value={PROGRAMS.length - 3} suffix="+" label="programs to choose from" />
            <Stat wide={wide || tablet} value={SUBJECTS.length} suffix="+" label="subjects you can learn or teach" first={!(wide || tablet)} />
            <Stat wide={wide || tablet} value={CATEGORIES.length} label="kinds of academic items" />
          </View>
        </View>

        {/* Promo video */}
        <View style={[section, { marginTop: 70 }]}>
          <Reveal distance={18}>
            <View style={styles.videoFrame}>
              <PromoVideo />
            </View>
          </Reveal>
        </View>

        {/* How it works */}
        <View onLayout={(e) => setAnchor('how', e)} style={[section, { marginTop: 110 }]}>
          <Reveal distance={18}>
            <Text style={styles.label}>How it works</Text>
            <Text style={[styles.h2, { fontSize: wide ? 46 : tablet ? 41 : 32, maxWidth: 760 }]}>Whether you need help or you can give it.</Text>
          </Reveal>
          <View style={{ flexDirection: wide || tablet ? 'row' : 'column', gap: wide ? 60 : 36, marginTop: 40 }}>
            <Steps
              title="If you need help"
              steps={[
                ['Sign up and verify', 'Pick your school and program, then upload your school ID and COR.'],
                ['Post or browse', 'Say what you’re stuck on, or browse tutors by subject. Search Assets for books and gear.'],
                ['Book and pay', 'Pick a time and Zoom, Meet or Teams, pay with GCash or Maya, then confirm when it’s done and leave a rating.'],
              ]}
            />
            <Steps
              title="If you can help"
              steps={[
                ['Apply to tutor', `Add your subjects, your rate (from ${peso(settings.min_tutor_rate)}/hour) and your CV.`],
                ['Accept bookings', 'Students book a time. Send your Zoom, Meet or Teams link before the session.'],
                ['Get paid', 'Once the student confirms, your earnings move to your wallet. Withdraw to GCash or Maya.'],
              ]}
            />
          </View>
        </View>

        {/* Tutors */}
        <View onLayout={(e) => setAnchor('tutors', e)} style={[section, styles.split, { flexDirection: wide ? 'row' : 'column' }]}>
          <Reveal distance={18} style={{ flex: 1 }}>
            <Text style={styles.label}>Tutors</Text>
            <Text style={[styles.h2, { fontSize: wide ? 42 : tablet ? 38 : 30 }]}>Learn from someone who just passed it.</Text>
            <Text style={[styles.body, { marginTop: 16 }]}>
              Tutors on PASA are students from schools around Santa Rosa who did well in the subject you’re taking now. Every tutor is reviewed by the PASA team, and every session is rated.
            </Text>
          </Reveal>
          <Reveal distance={18} delay={120} style={{ flex: 1, width: '100%' }}>
            <View style={{ gap: 12 }}>
              <TutorRow name="Miguel Reyes" meta="3rd year · BS Accountancy" subjects="Cost Accounting · Financial Accounting" rate={150} modes="Online · Zoom" rating="4.9" color="#B9E4F5" />
              <TutorRow name="Bea Cruz" meta="4th year · BS Computer Science" subjects="Calculus · Statistics · Programming" rate={160} modes="Online · Google Meet" rating="5.0" color="#F7C6D9" />
              <TutorRow name="Jon Villanueva" meta="4th year · BS Civil Engineering" subjects="Engineering Mechanics · Drafting" rate={180} modes="Online · MS Teams" rating="4.8" color="#C9F2D8" />
              <Text style={{ color: P.muted, fontSize: 13 }}>Sample profiles for illustration.</Text>
            </View>
          </Reveal>
        </View>

        {/* Assets */}
        <View onLayout={(e) => setAnchor('assets', e)} style={[section, styles.split, { flexDirection: wide ? 'row-reverse' : 'column' }]}>
          <Reveal distance={18} style={{ flex: 1 }}>
            <Text style={styles.label}>Assets</Text>
            <Text style={[styles.h2, { fontSize: wide ? 42 : tablet ? 38 : 30 }]}>The calculator you needed for one sem, someone else needs next sem.</Text>
            <Text style={[styles.body, { marginTop: 16 }]}>
              Sell or rent out books, calculators, lab gowns, drafting sets and uniforms to students nearby. Rentals come with a refundable deposit, and delivery is arranged between you in chat.
            </Text>
            <Text style={[styles.body, { marginTop: 12 }]}>Listings with photos are checked by an admin first, so answer keys and quizzes stay off PASA.</Text>
          </Reveal>
          <Reveal distance={18} delay={120} style={{ flex: 1, width: '100%' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Item icon="calculator-outline" title="Casio fx-991EX ClassWiz" price="₱900" note="Like new" />
              <Item icon="book-outline" title="Cost Accounting, Guerrero" price="₱420" note="Good" />
              <Item icon="flask-outline" title="Lab Gown (Medium)" price="₱280" note="Like new" />
              <Item icon="construct-outline" title="Drafting Set + T-square" price="₱40/wk" note="For rent" />
            </View>
          </Reveal>
        </View>

        {/* Payments */}
        <View style={[section, { marginTop: 110 }]}>
          <Reveal distance={18}>
            <Text style={styles.label}>Payments</Text>
            <Text style={[styles.h2, { fontSize: wide ? 42 : tablet ? 38 : 30, maxWidth: 760 }]}>Nobody gets paid until you say it went well.</Text>
          </Reveal>
          <Reveal distance={18} delay={100}>
            <View style={[styles.flow, { flexDirection: wide ? 'row' : 'column' }]}>
              {[
                ['You pay', `₱150 + ₱${Math.round((150 * settings.commission_rate) / 100)} fee through GCash or Maya.`],
                ['PASA holds it', 'The money waits while the session or handover happens.'],
                ['You confirm', 'Tap “Session done” or “I received it”. Cancelled? You’re refunded.'],
                ['They get paid', '₱150 lands in the tutor’s or seller’s wallet.'],
              ].map(([t, d], i, arr) => (
                <View key={t} style={{ flex: 1, flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch' }}>
                  <View style={styles.flowBox}>
                    <Text style={styles.flowNum}>{i + 1}</Text>
                    <Text style={{ fontFamily: H7, fontSize: 19, color: P.ink }}>{t}</Text>
                    <Text style={{ color: P.ink2, fontSize: 14.5, lineHeight: 21 }}>{d}</Text>
                  </View>
                  {i < arr.length - 1 && (
                    <Ionicons name={wide ? 'arrow-forward' : 'arrow-down'} size={20} color={P.muted} style={wide ? { marginHorizontal: 8 } : { marginVertical: 8, marginLeft: 24 }} />
                  )}
                </View>
              ))}
            </View>
          </Reveal>
        </View>

        {/* Safety + schools */}
        <View style={[section, styles.split, { flexDirection: wide ? 'row' : 'column', alignItems: 'flex-start' }]}>
          <Reveal distance={18} style={{ flex: 1 }}>
            <Text style={styles.label}>Safety</Text>
            <Text style={[styles.h2, { fontSize: wide ? 36 : tablet ? 33 : 28 }]}>Built for students, checked by people.</Text>
            <View style={{ gap: 14, marginTop: 22 }}>
              {[
                'Everyone is verified with a school ID and COR.',
                'Tutors are approved with their CV.',
                'Rude, foul or flirty messages and outside links are blocked.',
                'Report or block anyone. Banned accounts are logged out right away.',
                'Ratings after every session and sale.',
              ].map((t) => (
                <View key={t} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark" size={20} color={P.green} style={{ marginTop: 3 }} />
                  <Text style={[styles.body, { flex: 1 }]}>{t}</Text>
                </View>
              ))}
            </View>
          </Reveal>
          <Reveal distance={18} delay={100} style={{ flex: 1, width: '100%' }}>
            <View style={styles.schools}>
              <Text style={styles.label}>Open to students of</Text>
              {SCHOOL_NAMES.map((s) => (
                <Text key={s} style={styles.schoolLine}>
                  {s}
                </Text>
              ))}
              <Text style={[styles.schoolLine, { color: P.muted, borderBottomWidth: 0 }]}>and other colleges in Santa Rosa</Text>
            </View>
          </Reveal>
        </View>

        {/* PASA Plus */}
        <View style={[section, { marginTop: 110 }]}>
          <Reveal distance={18}>
            <Text style={styles.label}>PASA Plus</Text>
            <Text style={[styles.h2, { fontSize: wide ? 40 : tablet ? 36 : 30, maxWidth: 760 }]}>For tutors and sellers who want to be seen first.</Text>
            <Text style={[styles.body, { marginTop: 12, maxWidth: 680 }]}>
              {settings.plus_boosts} boosts a month to pin your posts and listings on top, a service fee that’s {settings.plus_discount} points lower, and a Plus badge. Your first month is free.
            </Text>
          </Reveal>
          <Reveal distance={18} delay={100}>
            <View style={[styles.plans, { flexDirection: wide ? 'row' : 'column' }]}>
              {PLUS_PLANS.map((p, i) => {
                const price = settings[p.key];
                const best = i === PLUS_PLANS.length - 1;
                return (
                  <View key={p.key} style={[styles.plan, best && { borderColor: P.ink, borderWidth: 2 }]}>
                    <Text style={{ fontFamily: H7, fontSize: 18, color: P.ink }}>{p.label}</Text>
                    <Text style={{ fontFamily: H, fontSize: 40, color: P.ink }}>{peso(price)}</Text>
                    <Text style={{ color: P.muted, fontSize: 14 }}>
                      {peso(Math.round(price / p.months))}/month · {settings.plus_boosts * p.months} boosts
                    </Text>
                    {best && <Text style={{ color: P.green, fontFamily: font.bold, fontSize: 13 }}>Best value</Text>}
                  </View>
                );
              })}
            </View>
          </Reveal>
        </View>

        {/* FAQ */}
        <View onLayout={(e) => setAnchor('faq', e)} style={[section, { marginTop: 110 }]}>
          <Reveal distance={18}>
            <Text style={[styles.h2, { fontSize: wide ? 40 : tablet ? 36 : 30 }]}>Questions</Text>
          </Reveal>
          <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: P.rule }}>
            {FAQ.map(([q, a]) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </View>
        </View>

        {/* Closing */}
        <View style={[section, { marginTop: 110 }]}>
          <View style={[styles.closing, { flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'flex-start' }]}>
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={[styles.h2, { color: '#fff', fontSize: wide ? 40 : tablet ? 36 : 30 }]}>Your next sem starts here.</Text>
              <Text style={{ color: '#C6D6E3', fontSize: 17, lineHeight: 26 }}>Free to join for college students in Santa Rosa, Laguna.</Text>
              <View style={{ marginTop: 10 }}>
                <StoreBadges />
              </View>
            </View>
            <Btn title="Create a free account" onPress={start} light />
          </View>
        </View>

        {/* Footer */}
        <View style={[section, styles.footer]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo size={26} variant={mode} />
            <Text style={{ color: P.muted }}>© {new Date().getFullYear()} PASA · Turn Potential Into PASAbilities</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 22, flexWrap: 'wrap' }}>
            <FootLink label="Terms & privacy" onPress={() => open('/legal')} />
            {!!FACEBOOK_URL && <FootLink label="Facebook" onPress={() => Linking.openURL(FACEBOOK_URL)} />}
            {!!CONTACT_EMAIL && <FootLink label={CONTACT_EMAIL} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />}
            <FootLink label="Admin" onPress={() => open('/admin')} />
          </View>
        </View>
      </ScrollView>
    </scroll.Provider>
    </PalCtx.Provider>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function Btn({ title, onPress, small, light }: { title: string; onPress: () => void; small?: boolean; light?: boolean }) {
  const P = usePal();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, small && { paddingVertical: 9, paddingHorizontal: 16 }, light && { backgroundColor: '#fff' }, pressed && { opacity: 0.85 }]}
    >
      <Text style={{ color: light ? INK_ON_LIGHT : P.btnText, fontFamily: font.bold, fontSize: small ? 14.5 : 16 }}>{title}</Text>
    </Pressable>
  );
}

function FootLink({ label, onPress }: { label: string; onPress: () => void }) {
  const P = usePal();
  return (
    <Text onPress={onPress} style={{ color: P.ink2, fontSize: 14.5 }}>
      {label}
    </Text>
  );
}

function Stat({ value, label, suffix = '', first, wide }: { value: number; label: string; suffix?: string; first?: boolean; wide: boolean }) {
  const P = usePal();
  const styles = useStyles();
  const { n, ref } = useCountUp(value, 1100);
  return (
    <View ref={ref} collapsable={false} style={[styles.stat, wide ? { flex: 1 } : { width: '50%', paddingHorizontal: 14 }, first && { borderLeftWidth: 0 }]}>
      <Text style={{ fontFamily: H, fontSize: wide ? 48 : 38, color: P.ink, lineHeight: wide ? 54 : 44 }}>
        {n}
        {suffix}
      </Text>
      <Text style={{ color: P.ink2, fontSize: 15 }}>{label}</Text>
    </View>
  );
}

function Steps({ title, steps }: { title: string; steps: [string, string][] }) {
  const P = usePal();
  const styles = useStyles();
  return (
    <Reveal distance={18} style={{ flex: 1 }}>
      <Text style={{ fontFamily: H7, fontSize: 22, color: P.ink, marginBottom: 16 }}>{title}</Text>
      {steps.map(([t, d], i) => (
        <View key={t} style={styles.step}>
          <Text style={styles.stepNum}>{String(i + 1).padStart(2, '0')}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 17, color: P.ink }}>{t}</Text>
            <Text style={{ color: P.ink2, fontSize: 15.5, lineHeight: 23 }}>{d}</Text>
          </View>
        </View>
      ))}
    </Reveal>
  );
}

function TutorRow({ name, meta, subjects, rate, modes, rating, color }: { name: string; meta: string; subjects: string; rate: number; modes: string; rating: string; color: string }) {
  const P = usePal();
  const styles = useStyles();
  return (
    <View style={styles.tutor}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: H7, color: INK_ON_LIGHT, fontSize: 17 }}>
          {name
            .split(' ')
            .map((w) => w[0])
            .join('')}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 16.5, color: P.ink }}>{name}</Text>
        <Text style={{ color: P.muted, fontSize: 13.5 }}>{meta}</Text>
        <Text style={{ color: P.ink2, fontSize: 14 }}>{subjects}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ fontFamily: H7, fontSize: 18, color: P.ink }}>{peso(rate)}/hr</Text>
        <Text style={{ color: P.muted, fontSize: 13 }}>{modes}</Text>
        <Text style={{ color: P.ink2, fontSize: 13 }}>★ {rating}</Text>
      </View>
    </View>
  );
}

function Item({ icon, title, price, note }: { icon: IconName; title: string; price: string; note: string }) {
  const P = usePal();
  const styles = useStyles();
  return (
    <View style={styles.item}>
      <View style={styles.itemPhoto}>
        <Ionicons name={icon} size={38} color={P.blue} />
      </View>
      <View style={{ padding: 12, gap: 3 }}>
        <Text numberOfLines={2} style={{ fontFamily: font.bold, fontSize: 14.5, color: P.ink, minHeight: 38 }}>
          {title}
        </Text>
        <Text style={{ fontFamily: H7, fontSize: 18, color: P.ink }}>{price}</Text>
        <Text style={{ color: P.muted, fontSize: 12.5 }}>{note}</Text>
      </View>
    </View>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const P = usePal();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((o) => !o)} style={styles.faq} accessibilityRole="button" accessibilityState={{ expanded: open }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 18, color: P.ink }}>{q}</Text>
        <Ionicons name={open ? 'remove' : 'add'} size={22} color={P.ink} />
      </View>
      {open && <Text style={{ color: P.ink2, fontSize: 16, lineHeight: 25, marginTop: 10, maxWidth: 820 }}>{a}</Text>}
    </Pressable>
  );
}

/* ── Hero "notice board": real PASA cards pinned with tape, settling in on load ── */

function Pinned({ children, rotate, delay, style }: { children: ReactNode; rotate: number; delay: number; style: object }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: reduced ? 0 : 650, delay: reduced ? 0 : delay, easing: Easing.out(Easing.back(1.2)), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [v, delay, reduced]);
  return (
    <Animated.View
      style={[
        { position: 'absolute' },
        style,
        {
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${rotate * 2.5}deg`, `${rotate}deg`] }) },
          ],
        },
      ]}
    >
      <View style={styles.tape} />
      {children}
    </Animated.View>
  );
}

function Board({ wide }: { wide: boolean }) {
  const P = usePal();
  const styles = useStyles();
  return (
    <View style={{ flex: 1 }}>
      <Pinned rotate={-3} delay={150} style={{ top: 10, left: wide ? 10 : 0, width: wide ? 330 : 290 }}>
        <View style={styles.note}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.avatar, { backgroundColor: '#F7C6D9' }]}>
              <Text style={styles.avatarText}>AS</Text>
            </View>
            <View>
              <Text style={styles.noteName}>Andrea Santos</Text>
              <Text style={styles.noteMeta}>1st year · BS Accountancy · 2h</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <Tag text="Needs a tutor" bg={P.marker} />
            <Tag text="Cost Accounting" />
            <Tag text="₱150/hr" />
          </View>
          <Text style={styles.noteBody}>Need help with job order costing before our long quiz on Friday. Online is okay!</Text>
          <Text style={{ color: P.muted, fontSize: 13 }}>3 tutors offered to help</Text>
        </View>
      </Pinned>
      <Pinned rotate={2.5} delay={350} style={{ top: wide ? 190 : 255, right: 0, width: wide ? 240 : 200 }}>
        <View style={[styles.note, { padding: 0, overflow: 'hidden', gap: 0 }]}>
          <View style={[styles.itemPhoto, { height: 110 }]}>
            <Ionicons name="calculator-outline" size={44} color={P.blue} />
          </View>
          <View style={{ padding: 14, gap: 4 }}>
            <Text style={styles.noteName}>Casio fx-991EX ClassWiz</Text>
            <Text style={{ fontFamily: H, fontSize: 22, color: P.ink }}>₱900</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Tag text="Like new" />
              <Tag text="For sale" />
            </View>
          </View>
        </View>
      </Pinned>
      <Pinned rotate={-1.5} delay={550} style={{ top: wide ? 300 : 480, left: wide ? 20 : 0, width: wide ? 280 : 250 }}>
        <View style={[styles.note, { gap: 8 }]}>
          <Text style={{ fontFamily: H7, fontSize: 15, color: P.green }}>✓ Booking paid</Text>
          <Text style={styles.noteName}>Cost Accounting with Miguel</Text>
          <Text style={styles.noteMeta}>Thu, 3:00 PM · 1 hour · Zoom</Text>
          <View style={{ height: 1, backgroundColor: P.rule, marginVertical: 4 }} />
          <Row k="Tutor fee" v="₱150" />
          <Row k="Service fee" v="₱15" />
          <Row k="Total · GCash" v="₱165" bold />
        </View>
      </Pinned>
    </View>
  );
}

function Tag({ text, bg }: { text: string; bg?: string }) {
  const P = usePal();
  return (
    <View style={{ backgroundColor: bg ?? P.skySoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: bg ? INK_ON_LIGHT : P.ink, fontSize: 12.5, fontFamily: font.semibold }}>{text}</Text>
    </View>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  const P = usePal();
  const s: TextStyle = { color: P.ink, fontSize: 14, fontFamily: bold ? font.bold : font.regular };
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={[s, !bold && { color: P.ink2 }]}>{k}</Text>
      <Text style={s}>{v}</Text>
    </View>
  );
}

/** Sun / moon switch: the icon turns and cross-fades while the page colors fade. */
function ThemeToggle({ dark, onPress }: { dark: boolean; onPress: () => void }) {
  const P = usePal();
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(dark ? 1 : 0));
  useEffect(() => {
    Animated.timing(v, { toValue: dark ? 1 : 0, duration: reduced ? 0 : 450, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [dark, v, reduced]);
  const spin = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: dark }}
      accessibilityLabel={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: P.rule, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      <Animated.View style={{ position: 'absolute', opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ rotate: spin }] }}>
        <Ionicons name="moon-outline" size={19} color={P.ink} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', opacity: v, transform: [{ rotate: spin }] }}>
        <Ionicons name="sunny-outline" size={20} color={P.ink} />
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = (P: Palette) =>
  StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 22 },
  navLink: { color: P.ink, fontFamily: font.semibold, fontSize: 15 },
  hero: { gap: 40, marginTop: 20 },
  kicker: { color: P.blue, fontFamily: font.bold, fontSize: 15 },
  h1: { fontFamily: H, color: P.ink, letterSpacing: -1.5 },
  h2: { fontFamily: H, color: P.ink, letterSpacing: -0.8 },
  lead: { color: P.ink2, fontSize: 18.5, lineHeight: 29, maxWidth: 560 },
  body: { color: P.ink2, fontSize: 17, lineHeight: 27 },
  label: { color: P.blue, fontFamily: font.bold, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  btn: { backgroundColor: P.btn, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 10 },
  stats: { borderTopWidth: 2, borderBottomWidth: 1, borderTopColor: P.ink, borderBottomColor: P.rule },
  stat: { paddingVertical: 22, paddingHorizontal: 22, gap: 4, borderLeftWidth: 1, borderLeftColor: P.rule },
  videoFrame: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0B1520' },
  step: { flexDirection: 'row', gap: 18, paddingVertical: 18, borderTopWidth: 1, borderTopColor: P.rule },
  stepNum: { fontFamily: H, fontSize: 22, color: P.blue, width: 34 },
  split: { marginTop: 110, gap: 48, alignItems: 'center' },
  tutor: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: P.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: P.rule },
  item: { width: '47%', flexGrow: 1, backgroundColor: P.card, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: P.rule },
  itemPhoto: { height: 120, backgroundColor: P.skySoft, alignItems: 'center', justifyContent: 'center' },
  flow: { marginTop: 36 },
  flowBox: { flex: 1, backgroundColor: P.card, borderRadius: 12, padding: 18, gap: 6, borderWidth: 1, borderColor: P.rule, minHeight: 150, alignSelf: 'stretch' },
  flowNum: { fontFamily: H, color: P.blue, fontSize: 16 },
  schools: { backgroundColor: P.card, borderRadius: 14, padding: 24, borderWidth: 1, borderColor: P.rule },
  schoolLine: { color: P.ink, fontSize: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: P.rule },
  plans: { gap: 14, marginTop: 30 },
  plan: { flex: 1, backgroundColor: P.card, borderRadius: 12, padding: 22, gap: 6, borderWidth: 1, borderColor: P.rule },
  faq: { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: P.rule },
  closing: { backgroundColor: P.band, borderRadius: 18, padding: 40, gap: 24 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, paddingVertical: 40 },
  note: {
    backgroundColor: P.card,
    borderRadius: 10,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: P.rule,
    shadowColor: '#10283D',
    shadowOpacity: P.shadow,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  tape: { position: 'absolute', top: -10, alignSelf: 'center', width: 80, height: 22, backgroundColor: P.tape, zIndex: 2, transform: [{ rotate: '-4deg' }] },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: H7, color: INK_ON_LIGHT, fontSize: 14 },
  noteName: { fontFamily: font.bold, fontSize: 15.5, color: P.ink },
  noteMeta: { color: P.muted, fontSize: 12.5 },
  noteBody: { color: P.ink, fontSize: 15, lineHeight: 22 },
});
