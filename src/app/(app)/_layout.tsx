import { Redirect, Stack } from 'expo-router';
import { DbUpdateNeeded } from '@/components/DbUpdateNeeded';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

// Every signed-in screen outside the tabs lives in this group. They all assume a loaded profile,
// so wait for it here instead of crashing (e.g. right after sign-in, or when a link is opened while logged out).
export default function SignedInLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Loading />;
  if (profile.verification_status === undefined) return <DbUpdateNeeded />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />;
}
