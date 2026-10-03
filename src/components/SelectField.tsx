import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '@/lib/haptics';
import { colors, elevation, font, radius, space, themed } from '@/theme';
import { Text, type IconName } from './ui';

export type SelectOption<T> = { value: T; label: string; icon?: IconName; hint?: string; disabled?: boolean };

type Props<T> = {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  /** Leading icon in the field when no option icon applies. */
  icon?: IconName;
  /** Overrides the text shown in the field (e.g. a custom value that isn't one of the options). */
  display?: string;
  sheetTitle?: string;
  /** Adds a search box to the sheet, for long lists. */
  searchable?: boolean;
};

/** Form dropdown: looks like a text field, opens a bottom sheet of options. */
export function SelectField<T extends string | number>({ label, value, options, onChange, placeholder = 'Select', icon, display, sheetTitle, searchable }: Props<T>) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const current = options.find((o) => o.value === value);
  const text = display ?? current?.label;

  const choose = (v: T) => {
    tap();
    onChange(v);
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={{ gap: 6 }}>
      {label && <Text variant="label">{label}</Text>}
      <Pressable
        onPress={() => {
          tap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? sheetTitle ?? 'Select'}: ${text ?? placeholder}`}
        style={({ pressed }) => [styles.field, open && { borderColor: colors.primary }, pressed && { opacity: 0.85 }]}
      >
        {(current?.icon ?? icon) && <Ionicons name={(current?.icon ?? icon)!} size={18} color={text ? colors.primaryDark : colors.muted} />}
        <Text style={[styles.value, !text && { color: colors.muted, fontFamily: font.regular }]} numberOfLines={1}>
          {text ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + space(3) }]} onPress={() => {}}>
            <View style={styles.handle} />
            <Text variant="title" style={styles.header}>
              {sheetTitle ?? label ?? 'Select'}
            </Text>
            {searchable && (
              <View style={styles.search}>
                <Ionicons name="search" size={17} color={colors.muted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search"
                  placeholderTextColor={colors.muted}
                  autoCorrect={false}
                  style={styles.searchInput}
                />
              </View>
            )}
            <ScrollView keyboardShouldPersistTaps="handled">
              {searchable && !shown.length && (
                <Text variant="muted" style={{ paddingHorizontal: space(5), paddingVertical: space(4) }}>
                  No matches for “{query.trim()}”
                </Text>
              )}
              {shown.map((o) => (
                <SheetOption key={String(o.value)} option={o} selected={o.value === value} onPress={() => choose(o.value)} />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SheetOption<T>({ option: o, selected, onPress }: { option: SelectOption<T>; selected: boolean; onPress: () => void }): ReactNode {
  return (
    <Pressable
      onPress={onPress}
      disabled={o.disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: o.disabled }}
      style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.bg }, o.disabled && { opacity: 0.4 }]}
    >
      {o.icon && (
        <View style={[styles.iconTile, selected && { backgroundColor: colors.primary }]}>
          <Ionicons name={o.icon} size={19} color={selected ? colors.white : colors.primaryDark} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: selected ? font.bold : font.semibold, fontSize: 15.5 }}>{o.label}</Text>
        {!!o.hint && (
          <Text variant="muted" style={{ fontSize: 12.5 }}>
            {o.hint}
          </Text>
        )}
      </View>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? colors.primary : colors.border} />
    </Pressable>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 50,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
    },
    value: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.text },
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
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: space(5),
      marginBottom: space(2),
      paddingHorizontal: 12,
      borderRadius: radius.md,
      backgroundColor: colors.bg,
    },
    searchInput: { flex: 1, minHeight: 42, fontFamily: font.regular, fontSize: 15, color: colors.text, outlineStyle: 'none' } as unknown as TextStyle,
    header: { paddingHorizontal: space(5), paddingTop: space(3), paddingBottom: space(2) },
    option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space(5), paddingVertical: 12 },
    iconTile: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  }),
);
