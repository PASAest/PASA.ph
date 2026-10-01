import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';

/** Opens (or creates) the 1:1 chat with another student. */
export async function openChat(otherUserId: string, draft?: string) {
  const { data, error } = await supabase.rpc('start_conversation', { other: otherUserId });
  if (error || !data) return notify('Could not open chat', error?.message);
  router.push({ pathname: '/chat/[id]', params: { id: data as string, ...(draft ? { draft } : {}) } });
}

/** Cross-platform alert (Alert.alert does nothing on web). */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

/** Cross-platform yes/no confirm. */
export function confirm(title: string, message: string, confirmLabel = 'Yes'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, onPress: () => resolve(true) },
    ]),
  );
}
