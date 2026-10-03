import { Redirect, Tabs } from 'expo-router';
import { DbUpdateNeeded } from '@/components/DbUpdateNeeded';
import { TabBar } from '@/components/TabBar';
import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

// 3.x · Bottom navigation: Home, Assets, Messages, Profile
export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Loading />;
  // Profiles gained these columns in the v2 schema; without them the app can't work properly.
  if (profile.verification_status === undefined) return <DbUpdateNeeded />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="assets" options={{ title: 'Assets' }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
