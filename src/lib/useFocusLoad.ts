import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs `load` whenever the screen gains focus (or `deps` change), and exposes pull-to-refresh state. */
export function useFocusLoad(load: () => Promise<void>, deps: unknown[] = []) {
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

  const refresh = async () => {
    setRefreshing(true);
    await loadRef.current();
    setRefreshing(false);
  };

  return { refreshing, refresh, loaded };
}
