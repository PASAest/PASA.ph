import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, space, themed } from '@/theme';
import { Button, Text, type IconName } from './ui';

type Props = {
  label: string;
  placeholder?: string;
  options: readonly string[];
  icon?: IconName;
  error?: string;
} & ({ multiple?: false; value: string | null; onChange: (v: string) => void } | { multiple: true; value: string[]; onChange: (v: string[]) => void });

/** A field that opens a searchable list. Used for schools, programs and subjects. */
export function Select(props: Props) {
  const { label, placeholder = 'Choose…', options, icon, error } = props;
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = props.multiple ? props.value : props.value ? [props.value] : [];
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;

  const pick = (o: string) => {
    if (props.multiple) {
      props.onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
    } else {
      props.onChange(o);
      setOpen(false);
      setQuery('');
    }
  };

  const summary = props.multiple ? (selected.length ? selected.join(', ') : '') : (props.value ?? '');

  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={[styles.field, !!error && { borderColor: colors.danger }]} accessibilityRole="button">
        {icon && <Ionicons name={icon} size={18} color={colors.muted} />}
        <Text numberOfLines={2} style={{ flex: 1, color: summary ? colors.text : colors.muted }}>
          {summary || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {!!error && <Text style={{ color: colors.danger, fontSize: 12.5 }}>{error}</Text>}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space(3) }]}>
            <View style={styles.header}>
              <Text variant="title" style={{ flex: 1 }}>
                {label}
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.search}>
              <Ionicons name="search" size={17} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.muted}
                style={styles.searchInput}
                autoFocus={false}
              />
            </View>
            <FlatList
              data={shown}
              keyExtractor={(o) => o}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const on = selected.includes(item);
                return (
                  <Pressable onPress={() => pick(item)} style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.bg }]}>
                    <Text style={{ flex: 1, fontFamily: on ? font.bold : font.regular }}>{item}</Text>
                    {on && <Ionicons name={props.multiple ? 'checkbox' : 'checkmark'} size={20} color={colors.primary} />}
                    {!on && props.multiple && <Ionicons name="square-outline" size={20} color={colors.muted} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text variant="muted" style={{ padding: space(4) }}>No matches.</Text>}
            />
            {props.multiple && <Button title={`Done (${selected.length})`} onPress={() => setOpen(false)} style={{ marginHorizontal: space(4) }} />}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 50,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      width: '100%',
      maxWidth: 430,
      alignSelf: 'center',
      height: '80%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      gap: space(2),
    },
    header: { flexDirection: 'row', alignItems: 'center', padding: space(4), paddingBottom: 0 },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: space(4),
      backgroundColor: colors.bg,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
    },
    searchInput: { flex: 1, minHeight: 42, fontFamily: font.regular, fontSize: 15, color: colors.text, outlineStyle: 'none' } as object,
    option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space(5), paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  }),
);
