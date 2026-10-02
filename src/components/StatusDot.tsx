import { View } from 'react-native';
import type { Presence } from '@/lib/types';
import { colors } from '@/theme';

/** Small dot on an avatar: green online, amber on session, gray offline. */
export function StatusDot({ status, size = 12 }: { status?: Presence; size?: number }) {
  if (!status) return null;
  const color = status === 'online' ? colors.success : status === 'on_session' ? colors.warning : colors.muted;
  return (
    <View
      accessibilityLabel={status}
      style={{
        position: 'absolute',
        right: -1,
        bottom: -1,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: 2,
        borderColor: colors.surface,
      }}
    />
  );
}
