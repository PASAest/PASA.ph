import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tap } from '@/lib/haptics';
import { colors, font, radius, space, themed } from '@/theme';
import { Text } from './ui';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  /** Days from today that can be picked (today is day 0). */
  maxDays?: number;
};

/** Month calendar for picking a day, from today up to `maxDays` ahead. */
export function CalendarPicker({ value, onChange, maxDays = 60 }: Props) {
  const today = startOfDay(new Date());
  const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + maxDays);
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const canPrev = month > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= last;
  const shift = (n: number) => {
    tap();
    setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  };

  // Leading blanks so the 1st lands on its weekday, then every day of the month.
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: month.getDay() }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Pressable onPress={() => shift(-1)} disabled={!canPrev} hitSlop={10} accessibilityLabel="Previous month" style={[styles.nav, !canPrev && { opacity: 0.3 }]}>
          <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
        </Pressable>
        <Text variant="title">{month.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => shift(1)} disabled={!canNext} hitSlop={10} accessibilityLabel="Next month" style={[styles.nav, !canNext && { opacity: 0.3 }]}>
          <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.row}>
          {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={styles.cell} />;
            const off = d < today || d > last;
            const selected = sameDay(d, value);
            const isToday = sameDay(d, today);
            return (
              <Pressable
                key={i}
                disabled={off}
                onPress={() => {
                  tap();
                  onChange(d);
                }}
                accessibilityRole="button"
                accessibilityLabel={d.toDateString()}
                accessibilityState={{ selected, disabled: off }}
                style={styles.cell}
              >
                <View style={[styles.day, isToday && styles.today, selected && styles.selected]}>
                  <Text style={[styles.dayText, off && { color: colors.muted, opacity: 0.45 }, selected && { color: colors.white, fontFamily: font.bold }]}>{d.getDate()}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: space(3), gap: 2 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space(2) },
    nav: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
    row: { flexDirection: 'row' },
    weekday: { flex: 1, textAlign: 'center', fontFamily: font.bold, fontSize: 12, color: colors.muted, paddingVertical: 6 },
    cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
    day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    today: { borderWidth: 1.5, borderColor: colors.primary },
    selected: { backgroundColor: colors.primary, borderColor: colors.primary },
    dayText: { fontFamily: font.semibold, fontSize: 14.5, color: colors.text },
  }),
);
