import type { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { notify } from './actions';
import { supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

const HEARTBEAT_MS = 60_000;

/** Signs a banned user out immediately and tells them why. */
async function kickOut(reason?: string) {
  await supabase.auth.signOut();
  router.replace('/welcome');
  notify('Account suspended', `${reason ? `Reason: ${reason}\n\n` : ''}Your PASA account was suspended for breaking the community rules. Contact the PASA team if you think this is a mistake.`);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = session?.user.id;

  const loadProfile = useCallback(async (uid?: string) => {
    if (!uid) return setProfile(null);
    const [{ data }, { data: ban }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('bans').select('reason').eq('user_id', uid).maybeSingle(),
    ]);
    if (ban) return kickOut(ban.reason);
    setProfile(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Defer so we don't call Supabase inside the auth callback.
      setTimeout(() => loadProfile(s?.user.id), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  // Banned while using the app → logged out right away.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`ban-${userId}-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bans', filter: `user_id=eq.${userId}` }, (payload) =>
        kickOut((payload.new as { reason?: string }).reason),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // "Online" status: update last_seen_at every minute while the app is open.
  useEffect(() => {
    if (!userId) return;
    const beat = () => {
      if (AppState.currentState === 'active') supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId).then();
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && beat());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [userId]);

  const refreshProfile = useCallback(() => loadProfile(userId), [loadProfile, userId]);

  return <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** The signed-in user's profile. Only use inside screens that require sign-in. */
export function useMe() {
  const { profile, session, refreshProfile } = useAuth();
  return { me: profile as Profile, userId: session?.user.id as string, refreshProfile };
}

/** Verified students only: book, buy, sell, tutor. Shows why and where to fix it otherwise. */
export function requireVerified(me: Profile | null): boolean {
  if (me?.verification_status === 'verified') return true;
  const msg =
    me?.verification_status === 'pending'
      ? 'Your ID and COR are being checked by the PASA team. You can browse in the meantime.'
      : 'Upload your school ID and COR so the PASA team can verify you\'re a student.';
  notify(me?.verification_status === 'pending' ? 'Verification in progress' : 'Verify your account first', msg);
  if (me?.verification_status !== 'pending') router.push('/verify');
  return false;
}
