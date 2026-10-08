import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small physical feedback on iPhones. Android phones buzz on every tap, so there it's turned off; the web has none.
const on = Platform.OS === 'ios';

export const tap = () => {
  if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
export const success = () => {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
export const warn = () => {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
