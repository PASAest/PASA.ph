import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import { tap } from '@/lib/haptics';
import { toast } from '@/lib/toast';
import { pickMedia, UploadError, type Picked } from '@/lib/upload';
import { colors, font, radius, themed } from '@/theme';
import { MenuSheet } from './MenuSheet';
import { Avatar, Text } from './ui';

type Props = {
  /** Currently shown image: a picked photo (local) or an existing URL. */
  value: Picked | string | null;
  onChange: (photo: Picked | null) => void;
  /** 'avatar' = round profile photo; 'cover' = wide listing photo. */
  shape?: 'avatar' | 'cover';
  /** Shown while the parent is uploading. */
  uploading?: boolean;
  name?: { first_name: string; last_name: string };
  allowRemove?: boolean;
};

/** Tap to take a photo or choose one from the library, with preview, uploading state and clear errors. */
export function PhotoPicker({ value, onChange, shape = 'cover', uploading, name, allowRemove }: Props) {
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const uri = typeof value === 'string' ? value : (value?.uri ?? null);
  const canUseCamera = Platform.OS !== 'web';

  const choose = async (source: 'camera' | 'library') => {
    setBusy(true);
    try {
      const photo = await pickMedia({ source, aspect: shape === 'avatar' ? [1, 1] : [4, 3] });
      if (photo) onChange(photo);
    } catch (e) {
      toast(e instanceof UploadError ? e.message : 'Couldn’t open your photos. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const open = () => {
    tap();
    if (!canUseCamera && !(allowRemove && uri)) choose('library');
    else setMenu(true);
  };

  const overlay = (busy || uploading) && (
    <View style={[StyleSheet.absoluteFill, styles.overlay, shape === 'avatar' && { borderRadius: 999 }]}>
      <ActivityIndicator color="#fff" />
      {uploading && <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 12.5, marginTop: 6 }}>Uploading…</Text>}
    </View>
  );

  return (
    <>
      {shape === 'avatar' ? (
        <Pressable onPress={open} style={{ alignSelf: 'center', alignItems: 'center', gap: 10 }} accessibilityRole="button" accessibilityLabel="Change profile photo">
          <View>
            <Avatar profile={{ first_name: name?.first_name ?? '', last_name: name?.last_name ?? '', avatar_url: uri }} size={112} />
            {overlay}
            <View style={styles.camBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </View>
          <Text style={{ color: colors.primary, fontFamily: font.bold }}>{uri ? 'Change photo' : 'Add a photo'}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={uri ? 'Change photo' : 'Add a photo'}>
          {uri ? (
            <View>
              <Image source={{ uri }} style={styles.cover} />
              {overlay}
              <View style={styles.changePill}>
                <Ionicons name="camera" size={15} color="#fff" />
                <Text style={{ color: '#fff', fontFamily: font.bold, fontSize: 13 }}>Change</Text>
              </View>
            </View>
          ) : (
            <View style={styles.empty}>
              {busy ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="camera-outline" size={34} color={colors.primary} />}
              <Text style={{ color: colors.primary, fontFamily: font.bold }}>Add a photo</Text>
              <Text variant="muted" style={{ fontSize: 12.5 }}>
                {canUseCamera ? 'Take one or choose from your gallery' : 'Choose an image from your computer'}
              </Text>
            </View>
          )}
        </Pressable>
      )}
      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          ...(canUseCamera ? [{ label: 'Take a photo', icon: 'camera-outline' as const, onPress: () => choose('camera') }] : []),
          { label: 'Choose from gallery', icon: 'images-outline', onPress: () => choose('library') },
          ...(allowRemove && uri ? [{ label: 'Remove photo', icon: 'trash-outline' as const, danger: true, onPress: () => onChange(null) }] : []),
        ]}
      />
    </>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    cover: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.border },
    empty: {
      height: 180,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.brand,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.surface,
    },
    overlay: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
    changePill: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    camBadge: {
      position: 'absolute',
      right: 2,
      bottom: 2,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.bg,
    },
  }),
);
