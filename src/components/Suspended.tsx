import { router } from 'expo-router';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { Mascot } from './Mascot';
import { Button, Card, Text } from './ui';

/** Shown instead of the app when an admin has banned the account. */
export function Suspended() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Mascot size={100} />
      <Text variant="h2">Account suspended</Text>
      <Card style={{ gap: 8, maxWidth: 420 }}>
        <Text style={{ textAlign: 'center' }}>
          Your PASA account was suspended for breaking the community rules. If you think this is a mistake, contact the PASA team.
        </Text>
      </Card>
      <Button
        title="Log out"
        variant="outline"
        onPress={async () => {
          await supabase.auth.signOut();
          router.replace('/welcome');
        }}
      />
    </View>
  );
}
