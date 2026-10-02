import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, View } from 'react-native';
import type { Picked } from '@/lib/upload';
import { pickDocument } from '@/lib/upload';
import { colors, radius } from '@/theme';
import { Text } from './ui';

/** One document slot (ID, COR, CV): tap to pick a photo or PDF. */
export function DocUpload({ label, hint, file, onPick, uploaded }: { label: string; hint: string; file: Picked | null; onPick: (f: Picked) => void; uploaded?: boolean }) {
  return (
    <Pressable
      onPress={async () => {
        const f = await pickDocument();
        if (f) onPick(f);
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderStyle: file || uploaded ? 'solid' : 'dashed',
        borderColor: file || uploaded ? colors.success : colors.brand,
        backgroundColor: colors.surface,
      }}
    >
      {file?.kind === 'image' ? (
        <Image source={{ uri: file.uri }} style={{ width: 56, height: 56, borderRadius: 8 }} />
      ) : (
        <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={file ? 'document-text' : uploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={26} color={uploaded && !file ? colors.success : colors.primary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title">{label}</Text>
        <Text variant="muted" numberOfLines={1}>
          {file ? file.name : uploaded ? 'Uploaded · tap to replace' : hint}
        </Text>
      </View>
      <Ionicons name={file || uploaded ? 'checkmark-circle' : 'add-circle-outline'} size={24} color={file || uploaded ? colors.success : colors.primary} />
    </Pressable>
  );
}
