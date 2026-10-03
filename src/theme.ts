import './lib/polyfills';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Scheme = 'light' | 'dark';

const light = {
  brand: '#87CEEB', // sky blue: logo and accents
  brandSoft: '#D6EFFA',
  primary: '#2A86C4', // deeper blue for buttons and links (readable with white text)
  primaryDark: '#1E6A9E', // blue text on light surfaces
  bg: '#F2FBFF',
  surface: '#FFFFFF', // cards, sheets, bars
  backdrop: '#E3F2FA', // behind the phone frame on laptops
  text: '#16324A',
  muted: '#6B8499',
  border: '#DCEAF2',
  success: '#2E9D5B',
  successSoft: '#DDF5E6',
  warning: '#B7791F',
  warningSoft: '#FDF1D8',
  danger: '#D14343',
  dangerSoft: '#FCE3E3',
  white: '#FFFFFF', // text and icons on primary buttons
  overlay: 'rgba(22,50,74,0.4)',
};

const dark: typeof light = {
  brand: '#87CEEB',
  brandSoft: '#16354A',
  primary: '#2A86C4',
  primaryDark: '#9AD2F2',
  bg: '#0E1923',
  surface: '#16242F',
  backdrop: '#08111A',
  text: '#E4F0F8',
  muted: '#8EA5B7',
  border: '#24384A',
  success: '#4CC07F',
  successSoft: '#15392A',
  warning: '#E3A94A',
  warningSoft: '#3A2D14',
  danger: '#F07272',
  dangerSoft: '#3D1D20',
  white: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.55)',
};

const STORAGE_KEY = 'pasa.theme';

export function storedMode(): ThemeMode {
  try {
    const v = globalThis.localStorage?.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function saveMode(mode: ThemeMode) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, mode);
  } catch {
    // storage unavailable: theme just won't persist
  }
}

/** Web: tint the browser / status bar with the page background so the top edge blends in. */
export function setBrowserBarColor(color: string) {
  if (typeof document === 'undefined') return;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;
}

/** The live palette. Its values are swapped in place when the theme changes. */
export const colors = { ...light };
export let scheme: Scheme = 'light';
let version = 0;

export function applyScheme(next: Scheme) {
  if (next === scheme) return;
  Object.assign(colors, next === 'dark' ? dark : light);
  scheme = next;
  version++;
  setBrowserBarColor(colors.bg);
}

/**
 * Wraps a style factory so styles are rebuilt after a theme change:
 *   const styles = themed(() => StyleSheet.create({ ... }));
 */
export function themed<T extends object>(factory: () => T): T {
  let cache: T | null = null;
  let builtFor = -1;
  return new Proxy({} as T, {
    get(_target, key) {
      if (builtFor !== version || !cache) {
        cache = factory();
        builtFor = version;
      }
      return cache[key as keyof T];
    },
  });
}

export const font = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_800ExtraBold',
  // Headings use the same characterful grotesque as the landing page.
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
};

/** Soft card shadow (lighter in light mode, deeper in dark mode). */
export const elevation = () => ({
  shadowColor: '#0B1A28',
  shadowOpacity: scheme === 'dark' ? 0.35 : 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
});

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };
export const space = (n: number) => n * 4;
