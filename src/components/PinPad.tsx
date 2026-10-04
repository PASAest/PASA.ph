import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { tap } from '@/lib/haptics';
import { colors, font, radius, space, themed } from '@/theme';
import { Text } from './ui';

export const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

type Props = {
  title: string;
  subtitle?: string;
  /** Shown under the dots. Give the pad a new `key` after a wrong PIN so it starts empty. */
  error?: string;
  busy?: boolean;
  /** Called once all digits are in. */
  onComplete: (pin: string) => void;
  footer?: ReactNode;
};

/** Four dots and a number pad (no keyboard needed, works the same on phones and the web). */
export function PinPad({ title, subtitle, error, busy, onComplete, footer }: Props) {
  const [pin, setPin] = useState('');

  const press = (k: string) => {
    if (busy) return;
    tap();
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + k;
    setPin(next);
    if (next.length === PIN_LENGTH) onComplete(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.lockIcon}>
        <Ionicons name="lock-closed" size={26} color={colors.primary} />
      </View>
      <Text variant="h2" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {!!subtitle && (
        <Text variant="muted" style={{ textAlign: 'center' }}>
          {subtitle}
        </Text>
      )}
      <View style={styles.dots} accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotOn, !!error && !pin && styles.dotError]} />
        ))}
      </View>
      <View style={{ height: 22, justifyContent: 'center' }}>
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          !!error && <Text style={{ color: colors.danger, textAlign: 'center', fontSize: 13.5 }}>{error}</Text>
        )}
      </View>
      <View style={styles.pad}>
        {KEYS.map((k, i) =>
          k === '' ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              onPress={() => press(k)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={k === 'del' ? 'Delete' : k}
              style={({ pressed }) => [styles.key, k !== 'del' && styles.keyNum, pressed && { backgroundColor: colors.brandSoft }]}
            >
              {k === 'del' ? <Ionicons name="backspace-outline" size={26} color={colors.text} /> : <Text style={styles.keyText}>{k}</Text>}
            </Pressable>
          ),
        )}
      </View>
      {footer}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    wrap: { alignItems: 'center', gap: space(2), paddingTop: space(4) },
    lockIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space(1) },
    dots: { flexDirection: 'row', gap: 18, marginTop: space(4) },
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.primary },
    dotOn: { backgroundColor: colors.primary },
    dotError: { borderColor: colors.danger },
    pad: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 76 + 2 * 18, gap: 18, rowGap: 14, marginTop: space(2) },
    key: { width: 76, height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    keyNum: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    keyText: { fontFamily: font.bold, fontSize: 26, color: colors.text },
  }),
);
