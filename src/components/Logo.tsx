import { Image } from 'react-native';
import { useTheme } from '@/lib/themeMode';

// PASA mark: a looping "P" in sky blue wearing a graduation cap. `size` is the mark's height.
const MARKS = {
  light: require('../../assets/logo-mark.png'),
  // Same mark with a lighter cap, so it stands out on dark backgrounds.
  dark: require('../../assets/logo-mark-dark.png'),
  // PASA Plus.
  gold: require('../../assets/logo-mark-gold.png'),
};
const ASPECT = 362 / 512;

type Props = {
  size?: number;
  /** Defaults to the current app theme. Pass 'light' or 'dark' where a screen has its own theme (the landing page). */
  variant?: keyof typeof MARKS;
};

export function Logo({ size = 40, variant }: Props) {
  const { scheme } = useTheme();
  return (
    <Image
      source={MARKS[variant ?? scheme]}
      style={{ width: Math.round(size * ASPECT), height: size }}
      resizeMode="contain"
      accessibilityLabel={variant === 'gold' ? 'PASA Plus logo' : 'PASA logo'}
    />
  );
}
