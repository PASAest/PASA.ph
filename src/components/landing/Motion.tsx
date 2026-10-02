import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

// Small motion toolkit for the landing page. Everything respects "reduce motion".
const native = Platform.OS !== 'web';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

/** A looping 0→1 value (optionally back and forth). */
function useLoop(duration: number, { yoyo = true, delay = 0 } = {}) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) return;
    const ease = Easing.inOut(Easing.sin);
    const anim = yoyo
      ? Animated.sequence([
          Animated.delay(delay),
          Animated.loop(
            Animated.sequence([
              Animated.timing(v, { toValue: 1, duration, easing: ease, useNativeDriver: native }),
              Animated.timing(v, { toValue: 0, duration, easing: ease, useNativeDriver: native }),
            ]),
          ),
        ])
      : Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: native }));
    anim.start();
    return () => anim.stop();
  }, [v, duration, yoyo, delay, reduced]);
  return v;
}

/** Gentle up-and-down bobbing, for floating cards. */
export function Float({ children, distance = 10, duration = 2600, delay = 0, style }: { children: ReactNode; distance?: number; duration?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(duration, { delay });
  return <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }] }]}>{children}</Animated.View>;
}

/** A glowing sphere circling a center point. Place inside a relatively positioned box. */
export function Orbit({ radius, size, duration, color, start = 0 }: { radius: number; size: number; duration: number; color: string; start?: number }) {
  const v = useLoop(duration, { yoyo: false });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: [`${start}deg`, `${start + 360}deg`] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, transform: [{ rotate }] }}>
      <View style={{ position: 'absolute', left: radius - size / 2, top: -size / 2 }}>
        <Glow size={size} color={color} core />
      </View>
    </Animated.View>
  );
}

/** Soft radial glow ("light leak"). */
export function Glow({ size, color, core = false, opacity = 1 }: { size: number; color: string; core?: boolean; opacity?: number }) {
  const id = `g${useId().replace(/:/g, '')}`;
  return (
    <Svg width={size} height={size} style={{ opacity }}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={core ? '#FFFFFF' : color} stopOpacity={core ? 1 : 0.55} />
          <Stop offset={core ? '0.35' : '0.4'} stopColor={color} stopOpacity={core ? 0.9 : 0.25} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/** A big blurred light leak that drifts slowly in the background. */
export function DriftingGlow({ size, color, x, y, dx = 60, dy = 40, duration = 9000, delay = 0 }: { size: number; color: string; x: number | `${number}%`; y: number; dx?: number; dy?: number; duration?: number; delay?: number }) {
  const v = useLoop(duration, { delay });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        marginLeft: -size / 2,
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
        ],
      }}
    >
      <Glow size={size} color={color} />
    </Animated.View>
  );
}

/* ── Scroll-triggered reveals ─────────────────────────────────────────── */

type ScrollState = { subscribe: (fn: (viewportHeight: number) => void) => () => void };
const ScrollCtx = createContext<ScrollState | null>(null);

/** Page-level scroll broadcaster. Call `report(viewportHeight)` from the ScrollView's onScroll. */
export function useRevealScroll() {
  const listeners = useRef(new Set<(h: number) => void>());
  const lastH = useRef(800);
  const [value] = useState<ScrollState>(() => ({
    subscribe: (fn) => {
      listeners.current.add(fn);
      setTimeout(() => fn(lastH.current), 50);
      return () => listeners.current.delete(fn);
    },
  }));
  const report = (viewportHeight: number) => {
    lastH.current = viewportHeight;
    listeners.current.forEach((fn) => fn(viewportHeight));
  };
  return { value, report, Provider: ScrollCtx.Provider };
}

/** True once this element's top has entered the viewport (stays true). Attach `ref` to a plain View. */
function useInView() {
  const ctx = useContext(ScrollCtx);
  const ref = useRef<View>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ctx || seen) return;
    return ctx.subscribe((h) => {
      ref.current?.measureInWindow((_x, y) => {
        if (y < h - 60) setSeen(true);
      });
    });
  }, [ctx, seen]);
  return { seen: seen || !ctx, ref };
}

/** Fades and slides children up the first time they scroll into view. */
export function Reveal({ children, delay = 0, distance = 28, style }: { children: ReactNode; delay?: number; distance?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const { seen, ref } = useInView();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!seen) return;
    Animated.timing(v, { toValue: 1, duration: reduced ? 0 : 700, delay: reduced ? 0 : delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [seen, v, delay, reduced]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      <Animated.View style={{ flex: 1, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }}>{children}</Animated.View>
    </View>
  );
}

/** Animates 0 → value when it scrolls into view ("climbing counter"). */
export function useCountUp(value: number, duration = 1400) {
  const reduced = useReducedMotion();
  const { seen, ref } = useInView();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced) {
      const t = setTimeout(() => setN(value), 0);
      return () => clearTimeout(t);
    }
    const start = Date.now();
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p === 1) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [seen, value, duration, reduced]);
  return { n, ref };
}

/** 0 → 1 progress once in view (for bars and line-graph reveals). */
export function useGrow(delay = 0, duration = 1300) {
  const reduced = useReducedMotion();
  const { seen, ref } = useInView();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!seen) return;
    Animated.timing(v, { toValue: 1, duration: reduced ? 0 : duration, delay: reduced ? 0 : delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [seen, v, delay, duration, reduced]);
  return { v, ref };
}

/** Endless horizontal scroll of items (school names). */
export function Marquee({ children, duration = 30000, width }: { children: ReactNode; duration?: number; width: number }) {
  const v = useLoop(duration, { yoyo: false });
  return (
    <View style={{ overflow: 'hidden', width: '100%' }}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, -width] }) }] }}>
        <View style={{ flexDirection: 'row', width }}>{children}</View>
        <View style={{ flexDirection: 'row', width }}>{children}</View>
      </Animated.View>
    </View>
  );
}

/** Headline that rises in word by word. */
export function KineticWords({ words, renderWord, stagger = 110, delay = 150 }: { words: string[]; renderWord: (w: string, i: number) => ReactNode; stagger?: number; delay?: number }) {
  const reduced = useReducedMotion();
  const [values] = useState(() => words.map(() => new Animated.Value(0)));
  useEffect(() => {
    Animated.stagger(
      reduced ? 0 : stagger,
      values.map((v) => Animated.timing(v, { toValue: 1, duration: reduced ? 0 : 650, delay: reduced ? 0 : delay, easing: Easing.out(Easing.back(1.4)), useNativeDriver: native })),
    ).start();
  }, [values, stagger, delay, reduced]);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {words.map((w, i) => (
        <View key={`${w}${i}`} style={{ overflow: 'hidden', paddingBottom: 4 }}>
          <Animated.View style={{ opacity: values[i], transform: [{ translateY: values[i].interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }] }}>
            {renderWord(w, i)}
          </Animated.View>
        </View>
      ))}
    </View>
  );
}

/** Fades in after a delay (hero sub-elements). */
export function FadeIn({ children, delay = 0, from = 16, style }: { children: ReactNode; delay?: number; from?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: reduced ? 0 : 800, delay: reduced ? 0 : delay, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [v, delay, reduced]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>{children}</Animated.View>;
}

/** Slow pulsing glow behind a call-to-action. */
export function Pulse({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useLoop(1800);
  return (
    <Animated.View style={[style, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]}>{children}</Animated.View>
  );
}
