import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Profile } from './types';

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  /** True when an admin has banned this user. */
  banned: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  banned: false,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [banned, setBanned] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId?: string) => {
    if (!userId) {
      setBanned(false);
      return setProfile(null);
    }
    const [{ data }, { data: ban }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('bans').select('user_id').eq('user_id', userId).maybeSingle(),
    ]);
    setProfile(data);
    setBanned(!!ban);
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

  const refreshProfile = useCallback(() => loadProfile(session?.user.id), [loadProfile, session]);

  return <AuthContext.Provider value={{ session, profile, banned, loading, refreshProfile }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** The signed-in user's profile. Only use inside screens that require sign-in. */
export function useMe() {
  const { profile, session, refreshProfile } = useAuth();
  return { me: profile as Profile, userId: session?.user.id as string, refreshProfile };
}
