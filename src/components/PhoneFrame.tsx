import { usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { colors } from '@/theme';

export const PHONE_WIDTH = 430;

/**
 * On a laptop browser, shows the student app in a centered phone-sized column so it looks like the mobile app.
 * Phones, narrow windows and the /admin panel render full width.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const path = usePathname();
  const framed = Platform.OS === 'web' && width > 600 && !path.startsWith('/admin');
  if (!framed) return <View style={{ flex: 1 }}>{children}</View>;
  return (
    <View style={styles.backdrop}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#E3F2FA', alignItems: 'center', paddingVertical: 24 },
  phone: {
    flex: 1,
    width: PHONE_WIDTH,
    maxHeight: 932,
    backgroundColor: colors.bg,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#16324A',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
});
