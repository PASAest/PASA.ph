import { router, usePathname, type Href } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { applyScheme, saveMode, storedMode, type Scheme, type ThemeMode } from '@/theme';

type ThemeState = { mode: ThemeMode; scheme: Scheme; setMode: (m: ThemeMode, opts?: { returnHere?: boolean }) => void };
const ThemeContext = createContext<ThemeState>({ mode: 'system', scheme: 'light', setMode: () => {} });

/**
 * Light / dark / follow-the-phone. Switching swaps the palette; <ThemeRemount> then rebuilds the screens so every
 * style updates, and we return to the screen you were on. Providers above <ThemeRemount> (auth, settings) stay
 * mounted, so the signed-in session is never lost mid-switch.
 */
export function ThemeProvider({ children }: { children: (scheme: Scheme) => ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(storedMode);
  const effective: Scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  applyScheme(effective);

  const path = usePathname();
  const returnTo = useRef<string | null>(null);
  useEffect(() => {
    if (returnTo.current && returnTo.current !== path) router.replace(returnTo.current as Href);
    returnTo.current = null;
  }, [effective, path]);

  const setMode = (m: ThemeMode, { returnHere = true }: { returnHere?: boolean } = {}) => {
    saveMode(m);
    returnTo.current = returnHere ? path : null;
    setModeState(m);
  };

  return (
    <ThemeContext.Provider value={{ mode, scheme: effective, setMode }}>
      {children(effective)}
    </ThemeContext.Provider>
  );
}

/** Wrap the screens (not the providers) in this: it remounts them when the theme changes. */
export function ThemeRemount({ children }: { children: ReactNode }) {
  const { scheme } = useContext(ThemeContext);
  return <Remount key={scheme}>{children}</Remount>;
}

function Remount({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const useTheme = () => useContext(ThemeContext);
