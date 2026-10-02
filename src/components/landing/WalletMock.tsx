import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../ui';
import { font } from '@/theme';
import { useCountUp, useGrow } from './Motion';
import { L } from './palette';

// Illustrative tutor wallet: the numbers are an example, not real PASA data.
const WEEKS = [600, 900, 750, 1300, 1150, 1700, 2100, 2650];
const W = 420;
const H = 130;
const max = 3000;
const pts = WEEKS.map((v, i) => [(i / (WEEKS.length - 1)) * (W - 12) + 6, H - 8 - (v / max) * (H - 20)] as const);
const linePath = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const areaPath = `${linePath} L${pts[pts.length - 1][0]} ${H} L${pts[0][0]} ${H} Z`;

export function WalletMock() {
  const { n: balance, ref: balanceRef } = useCountUp(4850, 1600);
  const { n: sessions, ref: sessionsRef } = useCountUp(23, 1400);
  const { n: rating, ref: ratingRef } = useCountUp(49, 1400);
  const { v: chartV, ref: chartRef } = useGrow(200, 1800);
  const [chartW, setChartW] = useState(W);
  return (
    <View style={styles.panel}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: L.text, fontFamily: font.bold, fontSize: 15 }}>Tutor wallet</Text>
        <Text style={{ color: L.muted, fontSize: 11 }}>Example</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <View ref={balanceRef} collapsable={false} style={[styles.stat, { flexGrow: 2 }]}>
          <Text style={styles.label}>Available balance</Text>
          <Text style={[styles.big, { color: L.sky }]}>₱{balance.toLocaleString('en-PH')}</Text>
        </View>
        <View ref={sessionsRef} collapsable={false} style={styles.stat}>
          <Text style={styles.label}>Sessions</Text>
          <Text style={styles.big}>{sessions}</Text>
        </View>
        <View ref={ratingRef} collapsable={false} style={styles.stat}>
          <Text style={styles.label}>Rating</Text>
          <Text style={styles.big}>
            {(rating / 10).toFixed(1)} <Ionicons name="star" size={16} color={L.amber} />
          </Text>
        </View>
      </View>

      {/* Earnings line: drawn left to right by widening a clipping box */}
      <View>
        <Text style={[styles.label, { marginBottom: 6 }]}>Weekly earnings</Text>
        <View ref={chartRef} collapsable={false} style={{ height: H, width: '100%' }} onLayout={(e) => setChartW(e.nativeEvent.layout.width)}>
          <View style={[styles.grid, { top: H * 0.33 }]} />
          <View style={[styles.grid, { top: H * 0.66 }]} />
          <Animated.View style={{ height: H, overflow: 'hidden', width: chartV.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}>
            <Svg width={chartW} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <Path d={areaPath} fill={L.sky} opacity={0.1} />
              <Path d={linePath} fill="none" stroke={L.sky} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

            </Svg>
          </Animated.View>
          {/* End marker sits outside the stretched SVG so it stays round */}
          <Animated.View
            style={[
              styles.endDot,
              { left: (pts[pts.length - 1][0] / W) * chartW - 6, top: pts[pts.length - 1][1] - 6, opacity: chartV.interpolate({ inputRange: [0, 0.9, 1], outputRange: [0, 0, 1] }) },
            ]}
          />
        </View>
      </View>

      {/* Progress bars */}
      <Bar label="Cost Accounting" value={0.82} delay={300} />
      <Bar label="Financial Accounting" value={0.64} delay={450} />
      <Bar label="Management Accounting" value={0.41} delay={600} />

      <View style={styles.toast}>
        <Ionicons name="checkmark-circle" size={18} color={L.green} />
        <Text style={{ color: L.text, fontSize: 12, flex: 1 }}>₱300 released for Cost Accounting</Text>
        <Text style={{ color: L.muted, fontSize: 11 }}>now</Text>
      </View>
    </View>
  );
}

function Bar({ label, value, delay }: { label: string; value: number; delay: number }) {
  const { v, ref } = useGrow(delay, 1200);
  return (
    <View ref={ref} collapsable={false} style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: L.text, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: L.muted, fontSize: 12 }}>{Math.round(value * 100)}% booked</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: v.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${value * 100}%`] }) }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: L.panel,
    borderRadius: 22,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: L.line,
    shadowColor: L.glowIndigo,
    shadowOpacity: 0.25,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 10 },
  },
  stat: { flexGrow: 1, flexBasis: 90, backgroundColor: L.panel2, borderRadius: 14, padding: 12, gap: 2 },
  label: { color: L.muted, fontSize: 11.5 },
  big: { color: L.text, fontFamily: font.black, fontSize: 24 },
  endDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: L.sky, borderWidth: 2, borderColor: L.panel },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: L.line },
  track: { height: 8, borderRadius: 4, backgroundColor: L.panel2, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: L.sky },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: L.panel2, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: L.line },
});
