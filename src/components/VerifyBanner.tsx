import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useMe } from '@/lib/auth';
import { colors, font, radius, space } from '@/theme';
import { Text } from './ui';

/** Home banner until the student is verified (ID + COR reviewed by an admin). */
export function VerifyBanner() {
  const { me } = useMe();
  if (me.verification_status === 'verified') return null;
  const copy = {
    unverified: { title: 'Verify your student account', body: 'Upload your school ID and COR to book tutors, buy and sell.', tone: colors.primary },
    pending: { title: 'Verification in progress', body: 'The PASA team is checking your ID and COR. You can browse meanwhile.', tone: colors.warning },
    rejected: { title: 'Please re-upload your documents', body: me.rejection_note || 'We couldn\'t verify your ID or COR.', tone: colors.danger },
  }[me.verification_status];
  if (!copy) return null;
  return (
    <Pressable onPress={() => router.push('/verify')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: space(3), borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: copy.tone }}>
        <Ionicons name="shield-checkmark-outline" size={26} color={copy.tone} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bold, color: copy.tone }}>{copy.title}</Text>
          <Text variant="muted">{copy.body}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
    </Pressable>
  );
}
