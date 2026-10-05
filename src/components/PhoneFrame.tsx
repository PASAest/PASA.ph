import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Root container for every screen. The app now fills any screen (phone, tablet or laptop); each screen sizes its
 * own content with the shared widths in lib/layout.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}
