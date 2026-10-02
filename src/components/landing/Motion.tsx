import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

// Small motion helpers for the landing page: scroll reveals and count-ups. Both respect "reduce motion".
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
