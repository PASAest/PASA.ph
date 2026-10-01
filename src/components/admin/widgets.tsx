import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type DimensionValue } from 'react-native';
import { colors, font, radius, space } from '@/theme';
import { Card, Text, type IconName } from '../ui';

/** One headline number with a label and optional note. */
export function StatTile({ label, value, note, icon }: { label: string; value: string; note?: string; icon: IconName }) {
  return (
    <Card style={styles.tile}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={16} color={colors.muted} />
        <Text variant="muted" style={{ fontSize: 13 }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontFamily: font.black, fontSize: 28, color: colors.text }}>{value}</Text>
      {note && (
        <Text variant="muted" style={{ fontSize: 12 }}>
          {note}
        </Text>
      )}
    </Card>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space(3) }}>{children}</View>;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={17} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={{ flex: 1, minHeight: 40, fontFamily: font.regular, fontSize: 14.5, color: colors.text, outlineStyle: 'none' } as object}
      />
    </View>
  );
}

export type Column<T> = { key: string; label: string; width?: DimensionValue; flex?: number; render: (row: T) => ReactNode };

/** Simple table: header row plus one row per item. Scrolls horizontally on narrow screens via minWidth. */
export function DataTable<T>({ columns, rows, rowKey, empty }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; empty: string }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={[styles.row, styles.header]}>
        {columns.map((c) => (
          <View key={c.key} style={{ width: c.width, flex: c.width ? undefined : (c.flex ?? 1) }}>
            <Text style={styles.headerText}>{c.label}</Text>
          </View>
        ))}
      </View>
      {rows.length === 0 ? (
        <Text variant="muted" style={{ padding: space(5), textAlign: 'center' }}>
          {empty}
        </Text>
      ) : (
        rows.map((r) => (
          <View key={rowKey(r)} style={styles.row}>
            {columns.map((c) => (
              <View key={c.key} style={{ width: c.width, flex: c.width ? undefined : (c.flex ?? 1), justifyContent: 'center' }}>
                {c.render(r)}
              </View>
            ))}
          </View>
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { gap: 4, flexGrow: 1, flexBasis: 180, minWidth: 160 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    flexGrow: 1,
    maxWidth: 420,
  },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: space(4), paddingVertical: space(3), borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' },
  header: { backgroundColor: colors.bg, borderTopWidth: 0 },
  headerText: { fontFamily: font.bold, fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
