import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Runs `load` whenever the screen gains focus (or `deps` change), and exposes pull-to-refresh state.
 * `liveTables` also reloads while the screen is focused whenever a row in those tables changes (Supabase Realtime),
 * so a change made by the other person shows up without reopening the app.
 */
export function useFocusLoad(load: () => Promise<void>, deps: unknown[] = [], liveTables: string[] = []) {
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const key = JSON.stringify(deps);

  useFocusEffect(
    useCallback(() => {
      loadRef.current().finally(() => setLoaded(true));
      // `key` is intentional: reload when the caller's deps (e.g. a filter) change.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]),
  );

  const liveKey = liveTables.join(',');
  useFocusEffect(
    useCallback(() => {
      if (!liveKey) return;
      let timer: ReturnType<typeof setTimeout> | undefined;
      // Several rows often change together (an order plus its payment), so reload once after they settle.
      const onChange = () => {
        clearTimeout(timer);
        timer = setTimeout(() => loadRef.current(), 300);
      };
      const channel = supabase.channel(`live-${liveKey}-${Math.random()}`);
      liveKey.split(',').forEach((table) => channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange));
      channel.subscribe();
      return () => {
        clearTimeout(timer);
        supabase.removeChannel(channel);
      };
    }, [liveKey]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await loadRef.current();
    setRefreshing(false);
  };

  return { refreshing, refresh, loaded };
}
