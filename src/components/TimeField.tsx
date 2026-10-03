import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { tap } from '@/lib/haptics';
import { colors, font, radius, space, themed } from '@/theme';
import { SelectField, type SelectOption } from './SelectField';
import { Text } from './ui';

const CUSTOM = 'custom';
const PRESETS = ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

/** "14:30" → "2:30 PM" */
export const timeLabel = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fromMinutes = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

type Props = {
  label?: string;
  /** 24-hour "H:MM", or null when nothing is picked yet. */
  value: string | null;
  onChange: (t: string) => void;
  /** Times before this (minutes after midnight) are shown as passed, e.g. earlier today. */
  earliest?: number;
  custom: boolean;
  onCustomChange: (custom: boolean) => void;
};

/** Start time: a dropdown of common times plus "Custom time", which opens hour / minute / AM-PM controls. */
export function TimeField({ label, value, onChange, earliest = 0, custom, onCustomChange }: Props) {
  const options: SelectOption<string>[] = [
    ...PRESETS.map((t) => ({
      value: t,
      label: timeLabel(t),
      disabled: toMinutes(t) < earliest,
      hint: toMinutes(t) < earliest ? 'Already passed' : undefined,
    })),
    { value: CUSTOM, label: 'Custom time', icon: 'create-outline', hint: 'Pick any time, in 5-minute steps' },
  ];

  const pick = (v: string) => {
    if (v === CUSTOM) {
      onCustomChange(true);
      // Start the editor from the current pick, or the next half hour that's still available.
      if (!value) onChange(fromMinutes(Math.min(Math.max(Math.ceil(earliest / 30) * 30, 8 * 60), 23 * 60 + 55)));
    } else {
      onCustomChange(false);
      onChange(v);
    }
  };

  const mins = value ? toMinutes(value) : 9 * 60;
  const set = (n: number) => {
    tap();
    onChange(fromMinutes(((n % 1440) + 1440) % 1440));
  };
  const pm = mins >= 720;

  return (
    <View style={{ gap: space(2) }}>
      <SelectField
        label={label}
        icon="time-outline"
        placeholder="Choose a time"
        sheetTitle="Start time"
        value={custom ? CUSTOM : value}
        display={value ? timeLabel(value) + (custom ? ' · custom' : '') : undefined}
        options={options}
        onChange={pick}
      />
      {custom && (
        <View style={styles.editor}>
          <Stepper label="Hour" text={String(Math.floor(mins / 60) % 12 || 12)} onDown={() => set(mins - 60)} onUp={() => set(mins + 60)} />
          <Text style={styles.colon}>:</Text>
          <Stepper label="Minute" text={String(mins % 60).padStart(2, '0')} onDown={() => set(mins - 5)} onUp={() => set(mins + 5)} />
          <View style={styles.ampm}>
            {(['AM', 'PM'] as const).map((p) => {
              const on = (p === 'PM') === pm;
              return (
                <Pressable
                  key={p}
                  onPress={() => !on && set(mins + (pm ? -720 : 720))}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[styles.ampmBtn, on && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.ampmText, on && { color: colors.white }]}>{p}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function Stepper({ label, text, onUp, onDown }: { label: string; text: string; onUp: () => void; onDown: () => void }) {
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <Pressable onPress={onUp} hitSlop={6} accessibilityLabel={`${label} up`} style={styles.step}>
        <Ionicons name="chevron-up" size={18} color={colors.primaryDark} />
      </Pressable>
      <Text style={styles.big}>{text}</Text>
      <Pressable onPress={onDown} hitSlop={6} accessibilityLabel={`${label} down`} style={styles.step}>
        <Ionicons name="chevron-down" size={18} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    editor: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(3),
      padding: space(3),
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    step: { width: 44, height: 30, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
    big: { fontFamily: font.black, fontSize: 28, color: colors.text, minWidth: 44, textAlign: 'center' },
    colon: { fontFamily: font.black, fontSize: 28, color: colors.muted, marginTop: -2 },
    ampm: { marginLeft: space(2), borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
    ampmBtn: { paddingHorizontal: 14, paddingVertical: 9 },
    ampmText: { fontFamily: font.bold, fontSize: 14, color: colors.primaryDark },
  }),
);
