import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';
import { Button, Card, Text } from './ui';

/** Shown when the app is newer than the database (supabase/schema.sql hasn't been re-run). */
export function DbUpdateNeeded() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Ionicons name="construct-outline" size={56} color={colors.primary} />
      <Text variant="h2" style={{ textAlign: 'center' }}>
        Database update needed
      </Text>
      <Card style={{ gap: 8, maxWidth: 420 }}>
        <Text>This version of PASA needs the latest database setup.</Text>
        <Text variant="muted">1. Open Supabase → SQL Editor → New query</Text>
        <Text variant="muted">2. Paste all of supabase/schema.sql and click Run (your data is kept)</Text>
        <Text variant="muted">3. Close and reopen the app</Text>
      </Card>
      <Button title="Log out" variant="ghost" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}
