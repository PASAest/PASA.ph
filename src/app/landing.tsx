import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import type { ReactNode } from 'react';
import { Animated, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { DriftingGlow, FadeIn, Float, KineticWords, Marquee, Orbit, Pulse, Reveal, useCountUp, useGrow, useRevealScroll } from '@/components/landing/Motion';
import { L } from '@/components/landing/palette';
import { PhoneMock } from '@/components/landing/PhoneMock';
import { WalletMock } from '@/components/landing/WalletMock';
import { Logo } from '@/components/Logo';
import { Text, type IconName } from '@/components/ui';
import { ANDROID_APK_URL, CATEGORIES, CONTACT_EMAIL, FACEBOOK_URL, PROGRAMS, SCHOOLS, SUBJECTS } from '@/config';
import { useAuth } from '@/lib/auth';
import { peso } from '@/lib/format';
import { useSettings } from '@/lib/settings';
import { font } from '@/theme';

const SCHOOL_NAMES = SCHOOLS.filter((s) => s !== 'Other');

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: 'shield-checkmark-outline', title: 'Verified students only', body: 'Everyone signs up with a school ID and COR. Tutors also submit a CV.' },
  { icon: 'videocam-outline', title: 'Online or in person', body: 'Meet on Zoom, Google Meet or MS Teams, or wherever you both agree.' },
  { icon: 'wallet-outline', title: 'GCash & Maya', body: 'PASA holds the payment until the session happens or the item arrives.' },
  { icon: 'chatbubbles-outline', title: 'Chat with photos & video', body: 'Talk it through before you book or buy. Rude words and links are filtered.' },
];

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'id-card-outline', title: 'Sign up & verify', body: 'Pick your school and program, then upload your ID and COR.' },
  { icon: 'search-outline', title: 'Find what you need', body: 'Post a need, browse tutors, or search Assets.' },
  { icon: 'checkmark-done-outline', title: 'Pay & rate', body: 'Pay with GCash or Maya, confirm when done, and rate each other.' },
];

// Landing page (web): a promo-style page with motion, for visitors before they sign in.
export default function Landing() {
  const { session } = useAuth();
  const { settings } = useSettings();
  const { width, height } = useWindowDimensions();
  const scroll = useRevealScroll();
  const wide = width >= 960;
  const pad = wide ? 48 : 20;
  if (session) return <Redirect href="/(tabs)" />;

  const start = () => router.push('/welcome');

  return (
    <scroll.Provider value={scroll.value}>
      <ScrollView
        style={{ flex: 1, backgroundColor: L.bg }}
        contentContainerStyle={{ alignItems: 'center', overflow: 'hidden' }}
        scrollEventThrottle={32}
        onScroll={() => scroll.report(height)}
        onLayout={() => scroll.report(height)}
      >
        {/* Light leaks drifting behind the hero */}
        <DriftingGlow size={wide ? 900 : 600} color={L.glowSky} x="72%" y={-260} dx={-80} dy={60} duration={11000} />
        <DriftingGlow size={wide ? 700 : 480} color={L.glowIndigo} x="12%" y={120} dx={90} dy={-40} duration={13000} delay={800} />
        <DriftingGlow size={500} color={L.glowTeal} x="50%" y={wide ? 640 : 1000} dx={-60} dy={30} duration={10000} delay={400} />

        <View style={[styles.page, { paddingHorizontal: pad }]}>
          {/* Nav */}
          <FadeIn style={styles.nav}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Logo size={36} />
              <Text style={{ fontFamily: font.black, fontSize: 21, color: L.text, letterSpacing: 1 }}>PASA</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <GhostButton title="Log in" onPress={() => router.push('/log-in')} />
              <CTA title="Get started" small onPress={start} />
            </View>
          </FadeIn>

          {/* Hero */}
          <View style={[styles.hero, { flexDirection: wide ? 'row' : 'column', minHeight: wide ? 640 : undefined }]}>
            <View style={{ flex: 1, gap: 22, maxWidth: 600 }}>
              <FadeIn delay={100}>
                <View style={styles.pill}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: L.green }} />
                  <Text style={{ color: L.text, fontSize: 13 }}>For college students in Santa Rosa, Laguna</Text>
                </View>
              </FadeIn>
              <KineticWords
                words={['Turn', 'Potential', 'Into', 'PASAbilities']}
                renderWord={(w, i) => (
                  <Text style={[styles.h1, { fontSize: wide ? 68 : 44, lineHeight: wide ? 76 : 52 }]}>
                    {i === 3 ? (
                      <>
                        <Text style={[styles.h1, { fontSize: wide ? 68 : 44, color: L.sky }]}>PASA</Text>bilities
                      </>
                    ) : (
                      `${w} `
                    )}
                  </Text>
                )}
              />
              <FadeIn delay={750}>
                <Text style={{ fontSize: wide ? 19 : 17, lineHeight: wide ? 29 : 26, color: L.muted }}>
                  Book student tutors online or in person, sell and rent academic items, and get paid safely through GCash or Maya. All in one app, with verified students only.
                </Text>
              </FadeIn>
              <FadeIn delay={950} style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <CTA title="Open PASA" icon="arrow-forward" onPress={start} />
                {!!ANDROID_APK_URL && <GhostButton title="Get the Android app" icon="logo-android" onPress={() => Linking.openURL(ANDROID_APK_URL)} />}
              </FadeIn>
              <FadeIn delay={1150} style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
                {(['Verified students', 'GCash & Maya', 'Zoom · Meet · Teams'] as const).map((t) => (
                  <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color={L.sky} />
                    <Text style={{ color: L.muted, fontSize: 13.5 }}>{t}</Text>
                  </View>
                ))}
              </FadeIn>
            </View>

            {/* Phone with orbiting spheres and floating UI cards */}
            <FadeIn delay={400} from={40} style={[styles.stage, { height: wide ? 600 : 560 }]}>
              <Orbit radius={wide ? 250 : 200} size={22} duration={14000} color={L.glowSky} />
              <Orbit radius={wide ? 210 : 170} size={14} duration={9000} color={L.glowIndigo} start={140} />
              <Orbit radius={wide ? 290 : 230} size={10} duration={20000} color={L.glowTeal} start={250} />
              <Float distance={12} duration={3200}>
                <PhoneMock scale={wide ? 1 : 0.9} />
              </Float>
              <Float distance={10} duration={2600} delay={300} style={[styles.floating, { top: wide ? 20 : 0, left: wide ? -40 : 0 }]}>
                <MiniCard icon="calendar" iconColor={L.sky} title="Booking confirmed" body="Cost Accounting · Thu 3:00 PM" />
              </Float>
              {wide && (
                <Float distance={14} duration={3000} delay={700} style={[styles.floating, { top: 200, right: -20 }]}>
                  <MiniCard icon="checkmark-circle" iconColor={L.green} title="+₱300 released" body="to Miguel's wallet" />
                </Float>
              )}
              {wide && (
                <Float distance={9} duration={2400} delay={1100} style={[styles.floating, { bottom: 90, left: 0 }]}>
                  <MiniCard icon="star" iconColor={L.amber} title="4.9 · Miguel R." body="“Super clear explanation!”" />
                </Float>
              )}
              <Float distance={11} duration={2800} delay={500} style={[styles.floating, { bottom: wide ? 30 : 10, right: wide ? 10 : 0 }]}>
                <MiniCard icon="videocam" iconColor={L.glowIndigo} title="Zoom link ready" body="Starts in 15 min" />
              </Float>
            </FadeIn>
          </View>

          {/* Climbing counters (real numbers from the app's lists) */}
          <Reveal>
            <View style={[styles.counters, { flexDirection: wide ? 'row' : 'column' }]}>
              <Counter value={SCHOOL_NAMES.length} label="colleges in Santa Rosa" />
              <Counter value={PROGRAMS.length - 3} suffix="+" label="programs" />
              <Counter value={SUBJECTS.length} suffix="+" label="tutoring subjects" />
              <Counter value={CATEGORIES.length} label="kinds of academic items" />
            </View>
          </Reveal>

          {/* Value prop 1: tutoring */}
          <Split
            wide={wide}
            eyebrow="Tutoring"
            title="Find a tutor in minutes, not group chats"
            body="Post what you need or browse verified student tutors. Book a time, choose online or in person, and pay safely. The tutor only gets paid once you confirm the session happened."
            points={['Online via Zoom, Google Meet or MS Teams', 'Or meet in person wherever you agree', 'Free cancellation until 15 minutes before']}
            art={<BookingMock />}
          />

          {/* Value prop 2: tutors earn (dashboard) */}
          <Split
            wide={wide}
            flip
            eyebrow="For tutors"
            title="Good at a subject? Turn it into income."
            body={`Set your own rate from ${peso(settings.min_tutor_rate)} an hour. Earnings land in your PASA wallet once sessions are confirmed, and you can withdraw to GCash or Maya.`}
            points={['Apply with your ID, COR and CV', 'Ratings build your reputation', 'Track earnings in your wallet']}
            art={<WalletMock />}
          />

          {/* Value prop 3: assets */}
          <Split
            wide={wide}
            eyebrow="Assets"
            title="Buy, sell & rent academic stuff"
            body="Pass on what you no longer need to students who do. Delivery is arranged between you in chat, and payment is held by PASA until the buyer confirms."
            points={['Rent for a week, with a refundable deposit', 'Listings are checked: no answer keys or quizzes', 'Boost a listing to reach more students']}
            art={<CategoryWall />}
          />

          {/* Feature grid */}
          <Reveal style={{ marginTop: 110 }}>
            <Eyebrow text="Built for trust" />
            <Text style={[styles.h2, { fontSize: wide ? 40 : 30 }]}>Everything a campus marketplace needs</Text>
          </Reveal>
          <View style={[styles.grid, { flexDirection: wide ? 'row' : 'column' }]}>
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 120} style={styles.feature}>
                <GlassCard>
                  <IconTile icon={f.icon} />
                  <Text style={styles.cardTitle}>{f.title}</Text>
                  <Text style={styles.cardBody}>{f.body}</Text>
                </GlassCard>
              </Reveal>
            ))}
          </View>

          {/* How it works */}
          <Reveal style={{ marginTop: 110 }}>
            <Eyebrow text="How it works" />
            <Text style={[styles.h2, { fontSize: wide ? 40 : 30 }]}>Three steps to your first session</Text>
          </Reveal>
          <Steps wide={wide} />

          {/* Schools marquee */}
          <Reveal style={{ marginTop: 100, gap: 18 }}>
            <Text style={{ color: L.muted, textAlign: 'center', fontSize: 14, letterSpacing: 2, textTransform: 'uppercase' }}>For students of</Text>
          </Reveal>
        </View>
        <View style={{ width: '100%', marginTop: 18 }}>
          <Marquee width={SCHOOL_NAMES.length * 416} duration={45000}>
            {SCHOOL_NAMES.map((s) => (
              <View key={s} style={styles.schoolChip}>
                <Ionicons name="school-outline" size={16} color={L.sky} />
                <Text style={{ color: L.text, fontFamily: font.semibold }} numberOfLines={1}>
                  {s}
                </Text>
              </View>
            ))}
          </Marquee>
        </View>

        <View style={[styles.page, { paddingHorizontal: pad }]}>
          {/* PASA Plus */}
          <Reveal style={{ marginTop: 110 }}>
            <View style={[styles.plus, { flexDirection: wide ? 'row' : 'column' }]}>
              <View style={{ flex: 1, gap: 12 }}>
                <Eyebrow text="PASA Plus" />
                <Text style={[styles.h2, { fontSize: wide ? 36 : 28 }]}>Get noticed. Pay less.</Text>
                <Text style={styles.cardBody}>
                  {settings.plus_boosts} boosts every month, a {settings.plus_discount}% lower service fee, and a Plus badge on your profile. Your first month is free.
                </Text>
              </View>
              <View style={{ gap: 10, minWidth: 220 }}>
                <Text style={{ color: L.muted }}>From</Text>
                <Text style={{ color: L.text, fontFamily: font.black, fontSize: 44 }}>
                  {peso(Math.round(settings.plus_price_12m / 12))}
                  <Text style={{ color: L.muted, fontSize: 16 }}> /month</Text>
                </Text>
                <Text style={{ color: L.muted, fontSize: 13 }}>on the 1-year plan · {peso(settings.plus_price_1m)} monthly</Text>
              </View>
            </View>
          </Reveal>

          {/* Final CTA */}
          <Reveal style={{ marginTop: 110 }}>
            <View style={styles.finalCta}>
              <DriftingGlow size={520} color={L.glowSky} x="50%" y={-240} dx={40} dy={20} duration={7000} />
              <Text style={[styles.h2, { fontSize: wide ? 46 : 32, textAlign: 'center' }]}>Ready to pass it on?</Text>
              <Text style={[styles.cardBody, { textAlign: 'center', maxWidth: 520 }]}>
                Join the student marketplace for Santa Rosa. It's free to sign up.
              </Text>
              <Pulse>
                <CTA title="Create your free account" icon="arrow-forward" onPress={start} />
              </Pulse>
            </View>
          </Reveal>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Logo size={24} />
              <Text style={{ color: L.muted }}>© {new Date().getFullYear()} PASA · Turn Potential Into PASAbilities</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap' }}>
              <FooterLink label="Terms & privacy" onPress={() => router.push('/terms')} />
              {!!FACEBOOK_URL && <FooterLink label="Facebook" onPress={() => Linking.openURL(FACEBOOK_URL)} />}
              {!!CONTACT_EMAIL && <FooterLink label={CONTACT_EMAIL} onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />}
              <FooterLink label="Admin" onPress={() => router.push('/admin')} />
            </View>
          </View>
        </View>
      </ScrollView>
    </scroll.Provider>
  );
}

/* ── Pieces ─────────────────────────────────────────────────────────────── */

function CTA({ title, icon, onPress, small }: { title: string; icon?: IconName; onPress: () => void; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cta, small && { paddingVertical: 9, paddingHorizontal: 16 }, pressed && { opacity: 0.85 }]}>
      <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: small ? 14 : 16 }}>{title}</Text>
      {icon && <Ionicons name={icon} size={small ? 15 : 18} color="#fff" />}
    </Pressable>
  );
}

function GhostButton({ title, icon, onPress }: { title: string; icon?: IconName; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.8 }]}>
      {icon && <Ionicons name={icon} size={16} color={L.text} />}
      <Text style={{ color: L.text, fontFamily: font.semibold, fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text onPress={onPress} style={{ color: L.muted, textDecorationLine: 'underline' }}>
      {label}
    </Text>
  );
}

function Eyebrow({ text }: { text: string }) {
  return <Text style={{ color: L.sky, fontFamily: font.bold, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>{text}</Text>;
}

function IconTile({ icon }: { icon: IconName }) {
  return (
    <View style={styles.iconTile}>
      <Ionicons name={icon} size={22} color={L.sky} />
    </View>
  );
}

function GlassCard({ children }: { children: ReactNode }) {
  return <View style={styles.glass}>{children}</View>;
}

function MiniCard({ icon, iconColor, title, body }: { icon: IconName; iconColor: string; title: string; body: string }) {
  return (
    <View style={styles.mini}>
      <View style={[styles.miniIcon, { backgroundColor: `${iconColor}22` }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View>
        <Text style={{ color: L.text, fontFamily: font.bold, fontSize: 13 }}>{title}</Text>
        <Text style={{ color: L.muted, fontSize: 11.5 }}>{body}</Text>
      </View>
    </View>
  );
}

function Counter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const { n, ref } = useCountUp(value);
  return (
    <View ref={ref} collapsable={false} style={styles.counter}>
      <Text style={{ color: L.text, fontFamily: font.black, fontSize: 44 }}>
        {n}
        <Text style={{ color: L.sky, fontFamily: font.black, fontSize: 44 }}>{suffix}</Text>
      </Text>
      <Text style={{ color: L.muted, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

function Split({
  wide,
  flip,
  eyebrow,
  title,
  body,
  points,
  art,
}: {
  wide: boolean;
  flip?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  art: ReactNode;
}) {
  return (
    <View style={[styles.split, { flexDirection: wide ? (flip ? 'row-reverse' : 'row') : 'column' }]}>
      <Reveal style={{ flex: 1, gap: 14 }}>
        <Eyebrow text={eyebrow} />
        <Text style={[styles.h2, { fontSize: wide ? 40 : 30 }]}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
        <View style={{ gap: 10, marginTop: 6 }}>
          {points.map((p) => (
            <View key={p} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={18} color={L.sky} />
              <Text style={{ color: L.text, fontSize: 15 }}>{p}</Text>
            </View>
          ))}
        </View>
      </Reveal>
      <Reveal delay={150} distance={50} style={{ flex: 1, width: '100%', maxWidth: 520 }}>
        {art}
      </Reveal>
    </View>
  );
}

/** Mock booking sheet: progress bar fills as the "request" moves through its steps. */
function BookingMock() {
  const { v, ref } = useGrow(300, 2200);
  const steps = ['Requested', 'Accepted', 'Paid', 'Done'];
  return (
    <GlassCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={[styles.avatar, { backgroundColor: '#B9E4F5' }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Cost Accounting with Miguel</Text>
          <Text style={{ color: L.muted, fontSize: 13 }}>Thu · 3:00 PM · 1 hour · Online via Zoom</Text>
        </View>
      </View>
      <View ref={ref} collapsable={false} style={{ gap: 10, marginTop: 6 }}>
        <View style={styles.track}>
          <Animated.View style={[styles.trackFill, { width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {steps.map((s) => (
            <Text key={s} style={{ color: L.muted, fontSize: 12 }}>
              {s}
            </Text>
          ))}
        </View>
      </View>
      <View style={{ gap: 8, marginTop: 4 }}>
        {[
          ['Tutor fee', '₱150'],
          ['PASA service fee', '₱15'],
        ].map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: L.muted }}>{k}</Text>
            <Text style={{ color: L.text }}>{v}</Text>
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: L.line }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={styles.cardTitle}>Total</Text>
          <Text style={[styles.cardTitle, { color: L.sky }]}>₱165</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={[styles.payPill, { backgroundColor: '#007DFE' }]}>
          <Text style={styles.payText}>GCash</Text>
        </View>
        <View style={[styles.payPill, { backgroundColor: '#00B464' }]}>
          <Text style={styles.payText}>Maya</Text>
        </View>
      </View>
    </GlassCard>
  );
}

/** Category tiles that rise in one after another. */
function CategoryWall() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {CATEGORIES.map((c, i) => (
        <Reveal key={c.key} delay={i * 90} style={{ width: '31%', flexGrow: 0 }}>
          <View style={styles.catTile}>
            <Ionicons name={`${c.icon}-outline`} size={26} color={L.sky} />
            <Text style={{ color: L.text, fontFamily: font.semibold, fontSize: 13.5, textAlign: 'center' }}>{c.label}</Text>
          </View>
        </Reveal>
      ))}
    </View>
  );
}

/** Steps joined by a line that fills in as it scrolls into view. */
function Steps({ wide }: { wide: boolean }) {
  const { v, ref } = useGrow(200, 1600);
  return (
    <View ref={ref} collapsable={false} style={{ marginTop: 36 }}>
      {wide && (
        <View style={styles.stepLine}>
          <Animated.View style={[styles.stepLineFill, { width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      )}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18 }}>
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 220} style={{ flex: 1 }}>
            <View style={{ alignItems: wide ? 'center' : 'flex-start', gap: 10 }}>
              <View style={styles.stepDot}>
                <Ionicons name={s.icon} size={24} color="#fff" />
              </View>
              <Text style={[styles.cardTitle, { textAlign: wide ? 'center' : 'left' }]}>
                {i + 1}. {s.title}
              </Text>
              <Text style={[styles.cardBody, { textAlign: wide ? 'center' : 'left', maxWidth: 300 }]}>{s.body}</Text>
            </View>
          </Reveal>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1200, paddingBottom: 20, zIndex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 22 },
  hero: { alignItems: 'center', gap: 40, marginTop: 20 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(135,206,235,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(135,206,235,0.25)',
  },
  h1: { fontFamily: font.black, color: L.text, letterSpacing: -1 },
  h2: { fontFamily: font.black, color: L.text, letterSpacing: -0.5 },
  stage: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  floating: { position: 'absolute', zIndex: 3 },
  mini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(13,24,35,0.88)',
    borderWidth: 1,
    borderColor: L.line,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  miniIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  counters: {
    marginTop: 60,
    gap: 1,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: L.line,
    backgroundColor: L.line,
  },
  counter: { flex: 1, backgroundColor: 'rgba(13,24,35,0.92)', padding: 26, gap: 4 },
  split: { marginTop: 120, gap: 48, alignItems: 'center' },
  grid: { gap: 16, marginTop: 30, flexWrap: 'wrap' },
  feature: { flex: 1, minWidth: 240 },
  glass: {
    flex: 1,
    gap: 12,
    padding: 22,
    borderRadius: 22,
    backgroundColor: 'rgba(13,24,35,0.85)',
    borderWidth: 1,
    borderColor: L.line,
  },
  iconTile: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(135,206,235,0.12)', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: L.text, fontFamily: font.bold, fontSize: 17 },
  cardBody: { color: L.muted, fontSize: 15.5, lineHeight: 24 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  track: { height: 8, borderRadius: 4, backgroundColor: L.panel2, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: L.sky },
  payPill: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  payText: { color: '#fff', fontFamily: font.bold, fontSize: 13 },
  catTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 22,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(13,24,35,0.85)',
    borderWidth: 1,
    borderColor: L.line,
  },
  stepLine: { position: 'absolute', top: 28, left: '16%', right: '16%', height: 2, backgroundColor: L.line },
  stepLineFill: { height: 2, backgroundColor: L.sky },
  stepDot: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: L.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: L.bg,
    shadowColor: L.glowSky,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  schoolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 400,
    marginRight: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(13,24,35,0.85)',
    borderWidth: 1,
    borderColor: L.line,
  },
  plus: {
    gap: 30,
    padding: 34,
    borderRadius: 28,
    backgroundColor: 'rgba(91,108,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(91,108,255,0.35)',
    alignItems: 'center',
  },
  finalCta: {
    width: '100%',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 70,
    paddingHorizontal: 24,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: L.panel,
    borderWidth: 1,
    borderColor: L.line,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: L.blue,
    shadowColor: L.glowSky,
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 6 },
  },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: L.line,
  },
  footer: { marginTop: 80, paddingTop: 24, borderTopWidth: 1, borderTopColor: L.line, gap: 14, paddingBottom: 30 },
});
