import type { ReactNode } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isInstalledApp } from '@/lib/appMode';

// iOS 26 draws a "Liquid Glass" blur over the top of home-screen web apps, reaching about 40pt below the status bar.
// It's system chrome (no CSS or meta tag turns it off), so instead the top safe area is extended by that much:
// every header already pads by the top inset, so its solid background fills the blurred band and its text and
// buttons sit below it.
const CLEARANCE = 40;

const isIOS = () =>
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function IosEdgeClearance({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const active = isIOS() && isInstalledApp() && height > width; // installed app, portrait
  if (!active) return <>{children}</>;
  return <SafeAreaInsetsContext.Provider value={{ ...insets, top: insets.top + CLEARANCE }}>{children}</SafeAreaInsetsContext.Provider>;
}
