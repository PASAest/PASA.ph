import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMe } from '@/lib/auth';
import { dateTime, fullName } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/types';
import { useNow } from '@/lib/useNow';
import { colors, font, radius, space } from '@/theme';
import { Text } from './ui';

/** Reminder card on Home for the next confirmed session in the coming 24 hours (highlighted 15 min before). */
export function UpcomingSession() {
  const { me } = useMe();
  const [next, setNext] = useState<Booking | null>(null);
  const now = useNow();

  useFocusEffect(
    useCallback(() => {
      const from = new Date(Date.now() - 2 * 3600000).toISOString();
      const to = new Date(Date.now() + 24 * 3600000).toISOString();
      supabase
        .from('bookings')
        .select('*, student:profiles!bookings_student_id_fkey(*), tutor:profiles!bookings_tutor_id_fkey(*)')
        .eq('status', 'paid')
        .gte('starts_at', from)
        .lte('starts_at', to)
        .order('starts_at')
        .limit(1)
        .then(({ data }) => setNext((data?.[0] as Booking) ?? null));
    }, []),
  );

  if (!next) return null;
  const mins = Math.ceil((new Date(next.starts_at).getTime() - now) / 60000);
  const ended = mins < -next.duration_min;
  if (ended) return null;
  const urgent = mins <= 15;
  const other = next.tutor_id === me.id ? next.student : next.tutor;
  const when = mins <= 0 ? 'Happening now' : mins <= 60 ? `Starts in ${mins} min` : dateTime(next.starts_at);

  return (
    <Pressable onPress={() => router.push('/activity')}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: space(3),
          borderRadius: radius.lg,
          backgroundColor: urgent ? colors.warningSoft : colors.white,
          borderWidth: 1.5,
          borderColor: urgent ? colors.warning : colors.border,
        }}
      >
        <Ionicons name="alarm" size={26} color={urgent ? colors.warning : colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bold, color: urgent ? colors.warning : colors.text }}>
            {when} · {next.subject}
          </Text>
          <Text variant="muted">
            With {fullName(other)} at {next.location}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}
