import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { colors, font, space, themed } from '@/theme';
import { Logo } from './Logo';
import { Text } from './ui';

/** Top bar used on the main tabs: small logo + PASA wordmark, optional action, and the notification bell. */
export function AppBar({ action }: { action?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const unread = useUnreadCount();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <View style={styles.logo}>
        <Logo size={34} />
        <Text style={styles.word}>PASA</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {action}
        <Pressable onPress={() => router.push('/notifications')} hitSlop={10} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={25} color={colors.text} />
          {unread > 0 && (
            <View style={styles.dot}>
              <Text style={styles.dotText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function useUnreadCount() {
  const { session } = useAuth();
  const [count, setCount] = useState(0);
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    const load = () =>
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .then(({ count: c }) => setCount(c ?? 0));
    load();
    const channel = supabase
      .channel(`notif-${userId}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
}

const styles = themed(() => StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingBottom: space(2),
    backgroundColor: colors.bg,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: font.black, fontSize: 22, color: colors.primaryDark, letterSpacing: 1 },
  dot: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dotText: { color: colors.white, fontSize: 10.5, fontFamily: font.bold },
}));
