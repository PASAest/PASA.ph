import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Presence } from './types';

const REFRESH_MS = 60_000;

/** Online / offline / on-session for a set of users, refreshed every minute. */
export function useStatuses(ids: (string | undefined)[]) {
  const [statuses, setStatuses] = useState<Record<string, Presence>>({});
  const key = [...new Set(ids.filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!key) return;
    const load = () =>
      supabase.rpc('user_statuses', { ids: key.split(',') }).then(({ data }) => {
        if (data) setStatuses(Object.fromEntries((data as { id: string; status: Presence }[]).map((r) => [r.id, r.status])));
      });
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [key]);

  return statuses;
}

export const PRESENCE_LABEL: Record<Presence, string> = { online: 'Online', offline: 'Offline', on_session: 'On session' };
