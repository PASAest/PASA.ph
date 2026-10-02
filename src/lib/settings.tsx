import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Profile } from './types';

/** Business rules the admin can change in /admin/settings. These defaults apply until they load. */
export type AppSettings = {
  commission_rate: number;
  plus_discount: number;
  min_tutor_rate: number;
  boost_price: number;
  boost_days: number;
  plus_boosts: number;
  plus_price_1m: number;
  plus_price_3m: number;
  plus_price_6m: number;
  plus_price_12m: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  commission_rate: 10,
  plus_discount: 5,
  min_tutor_rate: 150,
  boost_price: 20,
  boost_days: 3,
  plus_boosts: 10,
  plus_price_1m: 49,
  plus_price_3m: 129,
  plus_price_6m: 239,
  plus_price_12m: 449,
};

const SettingsContext = createContext<{ settings: AppSettings; reload: () => Promise<void> }>({
  settings: DEFAULT_SETTINGS,
  reload: async () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const fetchSettings = useCallback(
    () =>
      supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()
        .then(({ data }) => (data ? { ...DEFAULT_SETTINGS, ...(data as Partial<AppSettings>) } : null)),
    [],
  );
  const reload = useCallback(async () => {
    const next = await fetchSettings();
    if (next) setSettings(next);
  }, [fetchSettings]);
  useEffect(() => {
    let alive = true;
    fetchSettings().then((next) => alive && next && setSettings(next));
    return () => {
      alive = false;
    };
  }, [fetchSettings]);
  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);

export const isPlus = (p?: Profile | null) => !!p?.plus_until && new Date(p.plus_until) > new Date();

/** PASA's service fee rate (%) for this payer: the commission, minus the Plus discount for members. */
export const feeRate = (s: AppSettings, payer?: Profile | null) =>
  Math.max(0, s.commission_rate - (isPlus(payer) ? s.plus_discount : 0));

export const serviceFee = (amount: number, s: AppSettings, payer?: Profile | null) => Math.round((amount * feeRate(s, payer)) / 100);

export const PLUS_PLANS = [
  { months: 1, label: '1 month', key: 'plus_price_1m' },
  { months: 3, label: '3 months', key: 'plus_price_3m' },
  { months: 6, label: '6 months', key: 'plus_price_6m' },
  { months: 12, label: '1 year', key: 'plus_price_12m' },
] as const;
