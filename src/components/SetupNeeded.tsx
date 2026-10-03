import { View } from 'react-native';
import { colors } from '@/theme';
import { Logo } from './Logo';
import { Card, Text } from './ui';

/** Shown when .env is missing Supabase keys, so the app never crashes on a blank screen. */
export function SetupNeeded() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Logo size={110} />
      <Text variant="h2">Almost there!</Text>
      <Card style={{ gap: 8, maxWidth: 420 }}>
        <Text>PASA needs its Supabase keys.</Text>
        <Text variant="muted">1. Copy .env.example to .env</Text>
        <Text variant="muted">2. Paste your Supabase project URL and publishable key</Text>
        <Text variant="muted">3. Restart with: npx expo start --clear</Text>
      </Card>
    </View>
  );
}
