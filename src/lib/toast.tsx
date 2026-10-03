import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, themed } from '@/theme';
import { success as hapticSuccess, warn as hapticWarn } from './haptics';

type Kind = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; kind: Kind };

// Tiny global toast: call toast('Saved') from anywhere; <ToastHost /> in the root layout shows it.
let push: ((t: Omit<Toast, 'id'>) => void) | null = null;
export function toast(message: string, kind: Kind = 'success') {
  if (kind === 'success') hapticSuccess();
  if (kind === 'error') hapticWarn();
  push?.({ message, kind });
}

const ICON: Record<Kind, 'checkmark-circle' | 'alert-circle' | 'information-circle'> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<Toast | null>(null);
  const [y] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let id = 0;
    const native = Platform.OS !== 'web';
    push = (t) => {
      if (timer.current) clearTimeout(timer.current);
      setCurrent({ ...t, id: ++id });
      y.setValue(0);
      Animated.timing(y, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
      timer.current = setTimeout(() => {
        Animated.timing(y, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: native }).start(() => setCurrent(null));
      }, 2600);
    };
    return () => {
      push = null;
    };
  }, [y]);

  if (!current) return null;
  const tone = current.kind === 'error' ? colors.danger : current.kind === 'info' ? colors.primary : colors.success;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-start', alignItems: 'center' }]}>
      <Animated.View
        style={{
          marginTop: insets.top + 10,
          opacity: y,
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
        }}
      >
        <Pressable onPress={() => setCurrent(null)} style={styles.toast} accessibilityRole="alert">
          <Ionicons name={ICON[current.kind]} size={20} color={tone} />
          <Text style={styles.text}>{current.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      maxWidth: 400,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    text: { fontFamily: font.semibold, fontSize: 14.5, color: colors.text, flexShrink: 1 },
  }),
);
