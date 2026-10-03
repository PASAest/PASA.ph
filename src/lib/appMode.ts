import { Platform } from 'react-native';

/**
 * True inside the app: the native app, or the web app opened from the home screen ("Add to Home Screen").
 * False in a normal browser tab, where visitors first see the marketing landing page.
 */
export function isInstalledApp() {
  if (Platform.OS !== 'web') return true;
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
