import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { peso } from '@/lib/format';
import { colors, font, space } from '@/theme';
import { Button, Card, Text } from '../ui';

export type DayValue = { day: string; label: string; value: number };

const PLOT_H = 160;

/** Round the axis max up to a clean number (e.g. 37 → 40, 260 → 300). */
function niceMax(v: number) {
  if (v <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s * 4 >= v) ?? pow * 10;
  return step * 4;
}

/**
 * Single-series column chart of PASA revenue per day.
 * One hue, no legend (the title names the series); hover or tap a column for its value; table view toggle.
 */
export function RevenueChart({ title, subtitle, data }: { title: string; subtitle: string; data: DayValue[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const total = data.reduce((s, d) => s + d.value, 0);
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  return (
    <Card style={{ gap: space(4) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <View style={{ gap: 2 }}>
          <Text variant="title">{title}</Text>
          <Text variant="muted">{subtitle}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontFamily: font.black, fontSize: 20 }}>{peso(total)}</Text>
          <Button title={asTable ? 'Chart' : 'Table'} small variant="outline" onPress={() => setAsTable((t) => !t)} />
        </View>
      </View>

      {asTable ? (
        <View>
          {data.map((d) => (
            <View key={d.day} style={styles.tableRow}>
              <Text style={{ flex: 1 }}>{d.label}</Text>
              <Text style={{ fontFamily: font.semibold }}>{peso(d.value)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* y-axis ticks */}
          <View style={{ height: PLOT_H, justifyContent: 'space-between', alignItems: 'flex-end', width: 48 }}>
            {[...ticks].reverse().map((t) => (
              <Text key={t} style={styles.tick}>
                {peso(Math.round(t))}
              </Text>
            ))}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ height: PLOT_H }}>
              {/* hairline gridlines */}
              {ticks.map((t, i) => (
                <View key={t} style={[styles.grid, { bottom: (PLOT_H * i) / 4 }]} />
              ))}
              <View style={styles.columns}>
                {data.map((d, i) => {
                  const h = d.value > 0 ? Math.max(3, (d.value / max) * PLOT_H) : 0;
                  return (
                    <Pressable
                      key={d.day}
                      onHoverIn={() => setActive(i)}
                      onHoverOut={() => setActive((a) => (a === i ? null : a))}
                      onPress={() => setActive((a) => (a === i ? null : i))}
                      style={styles.slot}
                      accessibilityLabel={`${d.label}: ${peso(d.value)}`}
                    >
                      {active === i && (
                        <View style={[styles.tooltip, { bottom: h + 8 }]}>
                          <Text style={{ fontSize: 12, color: colors.muted }}>{d.label}</Text>
                          <Text style={{ fontFamily: font.bold }}>{peso(d.value)}</Text>
                        </View>
                      )}
                      {/* direct label only on the peak day */}
                      {i === peak && d.value > 0 && active !== i && (
                        <Text style={[styles.peakLabel, { bottom: h + 4 }]}>{peso(d.value)}</Text>
                      )}
                      <View
                        style={[
                          styles.bar,
                          { height: h, backgroundColor: colors.primary, opacity: active == null || active === i ? 1 : 0.55 },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {/* x-axis labels: first, middle, last */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
                <Text key={i} style={styles.tick}>
                  {data[i]?.label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  tick: { fontSize: 11.5, color: colors.muted },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
  columns: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end' },
  slot: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', maxWidth: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  tooltip: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 90,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  peakLabel: { position: 'absolute', fontSize: 11.5, fontFamily: font.semibold, color: colors.text, width: 80, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
});
