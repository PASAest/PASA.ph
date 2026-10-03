import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Small physical feedback on phones; does nothing on the web.
const on = Platform.OS === 'ios' || Platform.OS === 'android';

export const tap = () => {
  if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
export const success = () => {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
export const warn = () => {
  if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};
