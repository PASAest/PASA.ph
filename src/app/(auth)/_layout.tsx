import { Redirect, Stack, usePathname } from 'expo-router';
import { useAuth } from '@/lib/auth';

// Entering this group from outside (e.g. the landing page) starts at Welcome.
export const unstable_settings = { initialRouteName: 'welcome' };

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const path = usePathname();
  // Signed-in users skip the auth screens, except while finishing profile setup.
  if (!loading && session && path !== '/profile-setup') return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
