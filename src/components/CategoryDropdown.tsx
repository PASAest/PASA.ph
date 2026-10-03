import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES } from '@/config';
import { tap } from '@/lib/haptics';
import { colors, elevation, font, radius, space, themed } from '@/theme';
import { Text, type IconName } from './ui';

type Props = {
  value: string | null;
  onChange: (key: string | null) => void;
  /** Items per category for the current search/type filters, shown next to each option. */
  counts?: Record<string, number>;
};

/** Category picker for Assets: one compact button that opens a sheet of categories with icons and counts. */
export function CategoryDropdown({ value, onChange, counts }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = CATEGORIES.find((c) => c.key === value);
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  const options: { key: string | null; label: string; icon: IconName; count?: number }[] = [
    { key: null, label: 'All categories', icon: 'apps-outline', count: total },
    ...CATEGORIES.map((c) => ({ key: c.key, label: c.label, icon: `${c.icon}-outline` as IconName, count: counts?.[c.key] ?? 0 })),
  ];

  const choose = (key: string | null) => {
    tap();
    onChange(key);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          tap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Category: ${current?.label ?? 'All categories'}`}
        style={({ pressed }) => [styles.trigger, current && styles.triggerActive, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name={current ? (`${current.icon}-outline` as IconName) : 'apps-outline'} size={17} color={current ? colors.white : colors.primaryDark} />
        <Text style={[styles.triggerText, current && { color: colors.white }]} numberOfLines={1}>
          {current?.label ?? 'All categories'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={current ? colors.white : colors.primaryDark} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space(3) }]} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text variant="title" style={{ flex: 1 }}>
                Category
              </Text>
              {value && (
                <Pressable onPress={() => choose(null)} hitSlop={8}>
                  <Text style={{ color: colors.primary, fontFamily: font.bold }}>Clear</Text>
                </Pressable>
              )}
            </View>
            <ScrollView>
              {options.map((o) => {
                const selected = o.key === value;
                return (
                  <Pressable
                    key={o.key ?? 'all'}
                    onPress={() => choose(o.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.bg }]}
                  >
                    <View style={[styles.iconTile, selected && { backgroundColor: colors.primary }]}>
                      <Ionicons name={o.icon} size={20} color={selected ? colors.white : colors.primaryDark} />
                    </View>
                    <Text style={{ flex: 1, fontFamily: selected ? font.bold : font.semibold, fontSize: 15.5 }}>{o.label}</Text>
                    {o.count !== undefined && <Text variant="muted">{o.count}</Text>}
                    <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? colors.primary : colors.border} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      height: 38,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      maxWidth: 200,
    },
    triggerActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    triggerText: { fontFamily: font.bold, fontSize: 13.5, color: colors.primaryDark, flexShrink: 1 },
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      width: '100%',
      maxWidth: 430,
      maxHeight: '75%',
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      ...elevation(),
    },
    handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 10 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(5), paddingTop: space(3), paddingBottom: space(2) },
    option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space(5), paddingVertical: 12 },
    iconTile: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  }),
);
