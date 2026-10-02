import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Logo } from '../Logo';
import { Text } from '../ui';
import { font } from '@/theme';
import { L } from './palette';

/** A phone showing the PASA home screen. Purely illustrative. */
export function PhoneMock({ scale = 1 }: { scale?: number }) {
  return (
    <View style={[styles.phone, { transform: [{ perspective: 1200 }, { rotateY: '-14deg' }, { rotateX: '6deg' }, { scale }] }]}>
      <View style={styles.notch} />
      <View style={styles.screen}>
        <View style={styles.bar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Logo size={20} />
            <Text style={{ fontFamily: font.black, color: L.sky, fontSize: 14, letterSpacing: 1 }}>PASA</Text>
          </View>
          <Ionicons name="notifications-outline" size={16} color={L.text} />
        </View>
        <View style={styles.hello}>
          <Text style={{ fontFamily: font.black, color: '#fff', fontSize: 15 }}>Hi, Andrea!</Text>
          <Text style={{ color: '#fff', opacity: 0.9, fontSize: 10.5 }}>What do you want to learn today?</Text>
        </View>
        <View style={styles.composer}>
          <View style={[styles.avatar, { backgroundColor: '#F7A8B8' }]} />
          <Text style={{ color: L.muted, fontSize: 10.5 }}>Post something…</Text>
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.avatar, { backgroundColor: L.sky }]} />
            <View>
              <Text style={styles.name}>Andrea Santos</Text>
              <Text style={styles.tiny}>1st Year · BS Accountancy</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Chip label="Needs a tutor" color={L.amber} />
            <Chip label="Cost Accounting" color={L.muted} />
          </View>
          <Text style={{ color: L.text, fontSize: 10.5, lineHeight: 14 }}>Need help with job order costing before Friday. Online is fine!</Text>
        </View>
        <View style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          <View>
            <View style={[styles.avatar, { width: 30, height: 30, backgroundColor: '#B9E4F5' }]} />
            <View style={styles.dot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Miguel Reyes</Text>
            <Text style={styles.tiny}>₱150/hr · Online / In person</Text>
          </View>
          <View style={styles.book}>
            <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 10 }}>Book</Text>
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <View style={styles.tabs}>
          {(['home', 'library-outline', 'chatbubbles-outline', 'person-circle-outline'] as const).map((n, i) => (
            <Ionicons key={n} name={n} size={17} color={i === 0 ? L.sky : L.muted} />
          ))}
        </View>
      </View>
    </View>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: L.panel2, borderWidth: 1, borderColor: L.line }}>
      <Text style={{ color, fontSize: 9, fontFamily: font.bold }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    width: 250,
    height: 510,
    borderRadius: 38,
    padding: 9,
    backgroundColor: '#0A141E',
    borderWidth: 1,
    borderColor: '#2A4258',
    shadowColor: L.glowSky,
    shadowOpacity: 0.45,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 20 },
  },
  notch: { position: 'absolute', top: 16, alignSelf: 'center', width: 70, height: 18, borderRadius: 9, backgroundColor: '#05090E', zIndex: 2 },
  screen: { flex: 1, borderRadius: 30, backgroundColor: L.bg, overflow: 'hidden', padding: 10, paddingTop: 34, gap: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { backgroundColor: L.blue, borderRadius: 14, padding: 10, gap: 2 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: L.panel, borderRadius: 999, padding: 5, borderWidth: 1, borderColor: L.line },
  avatar: { width: 22, height: 22, borderRadius: 11 },
  card: { backgroundColor: L.panel, borderRadius: 12, padding: 9, gap: 6, borderWidth: 1, borderColor: L.line },
  name: { color: L.text, fontFamily: font.bold, fontSize: 11 },
  tiny: { color: L.muted, fontSize: 9 },
  dot: { position: 'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius: 5, backgroundColor: L.green, borderWidth: 2, borderColor: L.panel },
  book: { backgroundColor: L.blue, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  tabs: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8, borderTopWidth: 1, borderTopColor: L.line, marginHorizontal: -10, marginBottom: -10, backgroundColor: L.panel },
});
