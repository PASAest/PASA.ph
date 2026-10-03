import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '@/lib/haptics';
import { colors, elevation, font, radius, space, themed } from '@/theme';
import { Text, type IconName } from './ui';

export type FilterOption<T> = { value: T; label: string; icon?: IconName; count?: number };

type Props<T> = {
  /** Sheet title, e.g. "Category". */
  title: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (v: T) => void;
  /** The "show everything" option. The pill is highlighted when another option is picked. */
  allValue?: T;
  /** Icon for the pill when the picked option has none. */
  icon?: IconName;
};

/** Compact pill that opens a sheet of filter options, for list screens (Assets, admin tables). */
export function FilterDropdown<T extends string | number | null>({ title, value, options, onChange, allValue, icon }: Props<T>) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];
  const active = allValue !== undefined && value !== allValue;
  const pillIcon = current?.icon ?? icon;

  const choose = (v: T) => {
    tap();
    onChange(v);
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
        accessibilityLabel={`${title}: ${current?.label}`}
        style={({ pressed }) => [styles.trigger, active && styles.triggerActive, pressed && { opacity: 0.85 }]}
      >
        {pillIcon && <Ionicons name={pillIcon} size={17} color={active ? colors.white : colors.primaryDark} />}
        <Text style={[styles.triggerText, active && { color: colors.white }]} numberOfLines={1}>
          {current?.label}
        </Text>
        <Ionicons name="chevron-down" size={16} color={active ? colors.white : colors.primaryDark} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space(3) }]} onPress={() => {}}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text variant="title" style={{ flex: 1 }}>
                {title}
              </Text>
              {active && (
                <Pressable onPress={() => choose(allValue as T)} hitSlop={8}>
                  <Text style={{ color: colors.primary, fontFamily: font.bold }}>Clear</Text>
                </Pressable>
              )}
            </View>
            <ScrollView>
              {options.map((o) => {
                const selected = o.value === value;
                return (
                  <Pressable
                    key={String(o.value)}
                    onPress={() => choose(o.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.bg }]}
                  >
                    {o.icon && (
                      <View style={[styles.iconTile, selected && { backgroundColor: colors.primary }]}>
                        <Ionicons name={o.icon} size={20} color={selected ? colors.white : colors.primaryDark} />
                      </View>
                    )}
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
      maxWidth: 220,
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
    option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space(5), paddingVertical: 12, minHeight: 52 },
    iconTile: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  }),
);
