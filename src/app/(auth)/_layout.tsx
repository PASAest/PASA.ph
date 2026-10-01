import { Redirect, Stack, usePathname } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function AuthLayout() {
  const { session, loading } = useAuth();
  const path = usePathname();
  // Signed-in users skip the auth screens, except while finishing profile setup.
  if (!loading && session && path !== '/profile-setup') return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
