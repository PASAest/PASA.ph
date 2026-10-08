import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fullName, isPlus } from '@/lib/format';
import type { Profile } from '@/lib/types';
import { Text } from './ui';

type Variant = 'h2' | 'title' | 'label' | 'body';
const BADGE_SIZE: Record<Variant, number> = { h2: 20, title: 16, label: 15, body: 14 };

// Scalloped seal: 12 bumps around the center, like a verified badge.
const SEAL = (() => {
  const pts: string[] = [];
  const n = 24;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = i % 2 === 0 ? 12 : 10.4;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)},${(12 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
})();

/** Gold PASA Plus badge, shown after a member's name. */
export function PlusBadge({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="PASA Plus member">
      <Path d={SEAL} fill="#E0A526" stroke="#E0A526" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M7.4 12.3 L10.6 15.4 L16.8 9" fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type Props = {
  profile?: Pick<Profile, 'first_name' | 'last_name' | 'plus_until'> | null;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
  /** Wrapper style, e.g. to center the name. */
  rowStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
};

/** A person's full name, followed by the PASA Plus badge when they're a member. */
export function Name({ profile, variant = 'title', style, rowStyle, numberOfLines = 1 }: Props) {
  return (
    <View style={[styles.row, rowStyle]}>
      <Text variant={variant === 'body' ? undefined : variant} numberOfLines={numberOfLines} style={[{ flexShrink: 1 }, style]}>
        {fullName(profile)}
      </Text>
      {isPlus(profile as Profile) && <PlusBadge size={BADGE_SIZE[variant]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
});
