import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors, themed } from '@/theme';

/** Widest the app's content gets on tablets and laptops; wider screens get even margins on both sides. */
export const APP_MAX_WIDTH = 960;

/** Width the app's screens actually get (the window, capped at APP_MAX_WIDTH). */
export function useContentWidth() {
  const { width } = useWindowDimensions();
  return Math.min(width, APP_MAX_WIDTH);
}

/** Grid columns for item cards at the current width: 2 on phones, 3 on small tablets, 4 on large tablets and laptops. */
export function useGridColumns() {
  const w = useContentWidth();
  return w >= 840 ? 4 : w >= 600 ? 3 : 2;
}

/**
 * Lets the app fill tablets and laptops (instead of a phone-sized column), with content centered and capped at
 * APP_MAX_WIDTH so lines don't stretch across a wide monitor. Phones render as before.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width <= APP_MAX_WIDTH) return <View style={{ flex: 1 }}>{children}</View>;
  return (
    <View style={styles.backdrop}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
    column: { flex: 1, width: '100%', maxWidth: APP_MAX_WIDTH, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  }),
);
