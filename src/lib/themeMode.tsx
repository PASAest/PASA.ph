import { router, usePathname, type Href } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { applyScheme, saveMode, storedMode, type Scheme, type ThemeMode } from '@/theme';

type ThemeState = { mode: ThemeMode; scheme: Scheme; setMode: (m: ThemeMode, opts?: { returnHere?: boolean }) => void };
const ThemeContext = createContext<ThemeState>({ mode: 'system', scheme: 'light', setMode: () => {} });

/**
 * Light / dark / follow-the-phone. Switching swaps the palette and remounts the app so every
 * style is rebuilt, then returns to the screen you were on.
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
      <ThemeKey scheme={effective}>{children(effective)}</ThemeKey>
    </ThemeContext.Provider>
  );
}

function ThemeKey({ scheme, children }: { scheme: Scheme; children: ReactNode }) {
  return <ThemeRemount key={scheme}>{children}</ThemeRemount>;
}

function ThemeRemount({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const useTheme = () => useContext(ThemeContext);
