import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, font, radius, space } from '@/theme';
import type { Profile } from '@/lib/types';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Variant = 'body' | 'title' | 'h1' | 'h2' | 'label' | 'small' | 'muted';

export function Text({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <RNText {...props} style={[styles.body, textVariants[variant], style]} />;
}

const textVariants: Record<Variant, TextStyle> = {
  body: {},
  title: { fontFamily: font.bold, fontSize: 17 },
  h1: { fontFamily: font.black, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: font.black, fontSize: 21, lineHeight: 27 },
  label: { fontFamily: font.bold, fontSize: 14 },
  small: { fontSize: 12.5 },
  muted: { color: colors.muted, fontSize: 13.5 },
};

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'soft';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style }: ButtonProps) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: v.bg, borderColor: v.border },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 15 : 18} color={v.fg} />}
          <RNText style={[styles.buttonText, small && { fontSize: 13.5 }, { color: v.fg }]}>{title}</RNText>
        </>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  outline: { bg: 'transparent', fg: colors.primary, border: colors.primary },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
  danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  soft: { bg: colors.brandSoft, fg: colors.primaryDark, border: colors.brandSoft },
};

type FieldProps = ComponentProps<typeof TextInput> & { label?: string; error?: string; icon?: IconName };

export function Field({ label, error, icon, style, secureTextEntry, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  return (
    <View style={{ gap: 6 }}>
      {label && <Text variant="label">{label}</Text>}
      <View style={[styles.field, focused && { borderColor: colors.primary }, !!error && { borderColor: colors.danger }]}>
        {icon && <Ionicons name={icon} size={18} color={colors.muted} />}
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }, style]}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel="Show password">
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={{ color: colors.danger, fontSize: 12.5 }}>{error}</Text>}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? colors.white : colors.primaryDark} />}
      <RNText style={[styles.chipText, selected && { color: colors.white }]}>{label}</RNText>
    </Pressable>
  );
}

/** Horizontal single-choice picker built from chips. */
export function ChipSelect<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format = String,
}: {
  label?: string;
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <View style={{ gap: 8 }}>
      {label && <Text variant="label">{label}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => (
          <Chip key={String(o)} label={format(o)} selected={o === value} onPress={() => onChange(o)} />
        ))}
      </View>
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Avatar({ profile, size = 40 }: { profile?: Pick<Profile, 'first_name' | 'last_name' | 'avatar_url'> | null; size?: number }) {
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  if (profile?.avatar_url) {
    return <Image source={{ uri: profile.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <RNText style={{ fontFamily: font.bold, color: colors.primaryDark, fontSize: size * 0.38 }}>{initials}</RNText>
    </View>
  );
}

const badgeTones = {
  green: { bg: colors.successSoft, fg: colors.success },
  yellow: { bg: colors.warningSoft, fg: colors.warning },
  red: { bg: colors.dangerSoft, fg: colors.danger },
  blue: { bg: colors.brandSoft, fg: colors.primaryDark },
  gray: { bg: '#EEF2F5', fg: colors.muted },
};

export function Badge({ label, tone = 'blue', icon }: { label: string; tone?: keyof typeof badgeTones; icon?: IconName }) {
  const t = badgeTones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      {icon && <Ionicons name={icon} size={11} color={t.fg} />}
      <RNText style={[styles.badgeText, { color: t.fg }]}>{label}</RNText>
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color="#F5B301"
        />
      ))}
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {text && (
        <Text variant="muted" style={{ textAlign: 'center' }}>
          {text}
        </Text>
      )}
      {action}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function DemoBanner() {
  return (
    <View style={styles.demo}>
      <Ionicons name="flask-outline" size={14} color={colors.warning} />
      <RNText style={{ fontFamily: font.bold, color: colors.warning, fontSize: 12 }}>DEMO MODE · no real money is charged</RNText>
    </View>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space(2) }} />;
}

const styles = StyleSheet.create({
  body: { fontFamily: font.regular, fontSize: 15, color: colors.text },
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: 14 },
  buttonText: { fontFamily: font.bold, fontSize: 16 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  input: { flex: 1, minHeight: 48, fontFamily: font.regular, fontSize: 15, color: colors.text, outlineStyle: 'none' } as unknown as TextStyle,
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.primaryDark },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: { fontFamily: font.bold, fontSize: 11.5 },
  empty: { alignItems: 'center', gap: 8, padding: 32 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  demo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.warningSoft,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
});
