import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Loading, type IconName } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, font } from '@/theme';

function TabIcon({ icon, activeIcon, color, focused }: { icon: IconName; activeIcon: IconName; color: ColorValue; focused: boolean }) {
  return <Ionicons name={focused ? activeIcon : icon} size={24} color={color as string} />;
}

// 3.x · Bottom navigation: Home, Assets, Messages, Profile
export default function TabsLayout() {
  const { session, profile, loading } = useAuth();
  if (loading) return <Loading />;
  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return <Loading />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: font.bold, fontSize: 11.5 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: (p) => <TabIcon icon="home-outline" activeIcon="home" {...p} /> }} />
      <Tabs.Screen name="assets" options={{ title: 'Assets', tabBarIcon: (p) => <TabIcon icon="library-outline" activeIcon="library" {...p} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: (p) => <TabIcon icon="chatbubbles-outline" activeIcon="chatbubbles" {...p} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: (p) => <TabIcon icon="person-circle-outline" activeIcon="person-circle" {...p} /> }} />
    </Tabs>
  );
}
