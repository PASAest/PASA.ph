import { Image } from 'react-native';

// PASA mark: a looping "P" in sky blue wearing a graduation cap. `size` is the mark's height.
const MARK = require('../../assets/logo-mark.png');
const ASPECT = 362 / 512;

export function Logo({ size = 40 }: { size?: number }) {
  return <Image source={MARK} style={{ width: Math.round(size * ASPECT), height: size }} resizeMode="contain" accessibilityLabel="PASA logo" />;
}
