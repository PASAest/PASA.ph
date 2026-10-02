import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Minimalist PASA mark: a rounded sky-blue tile with a single-stroke "P" and a dot ("pass it on").
export const LOGO_BLUE = '#87CEEB';
export const LOGO_INK = '#1E6A9E';

export function Logo({ size = 40, tile = true }: { size?: number; tile?: boolean }) {
  const stroke = tile ? '#FFFFFF' : LOGO_INK;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {tile && <Rect x={0} y={0} width={100} height={100} rx={26} fill={LOGO_BLUE} />}
      <Path d="M36 76 V26 H55 A15 15 0 0 1 55 56 H36" fill="none" stroke={stroke} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={68} cy={74} r={6.5} fill={stroke} />
    </Svg>
  );
}
