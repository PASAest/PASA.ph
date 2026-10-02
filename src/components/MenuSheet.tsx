import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space, themed } from '@/theme';
import { Text, type IconName } from './ui';

export type MenuItem = { label: string; icon: IconName; onPress: () => void; danger?: boolean };

/** Bottom sheet of actions, used for "More" menus. */
export function MenuSheet({ visible, onClose, items }: { visible: boolean; onClose: () => void; items: MenuItem[] }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + space(3) }]}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: colors.bg }]}
              onPress={() => {
                onClose();
                item.onPress();
              }}
            >
              <Ionicons name={item.icon} size={21} color={item.danger ? colors.danger : colors.text} />
              <Text variant="title" style={item.danger ? { color: colors.danger } : undefined}>
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.item} onPress={onClose}>
            <Ionicons name="close" size={21} color={colors.muted} />
            <Text variant="title" style={{ color: colors.muted }}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: space(2) },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: space(5), paddingVertical: space(4) },
}));
