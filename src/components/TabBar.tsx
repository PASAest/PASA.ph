import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requireVerified, useMe } from '@/lib/auth';
import { tap } from '@/lib/haptics';
import { colors, elevation, font, themed } from '@/theme';
import { centered } from '@/lib/layout';
import { MenuSheet } from './MenuSheet';
import { Text, type IconName } from './ui';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Home', icon: 'home-outline', active: 'home' },
  assets: { label: 'Assets', icon: 'library-outline', active: 'library' },
  messages: { label: 'Messages', icon: 'chatbubbles-outline', active: 'chatbubbles' },
  profile: { label: 'Profile', icon: 'person-circle-outline', active: 'person-circle' },
};

type Props = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean }; navigate: (name: string) => void };
};

/** Bottom bar: Home · Assets · ＋ · Messages · Profile. The ＋ opens a "what do you want to do?" menu. */
export function TabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { me } = useMe();
  const [menu, setMenu] = useState(false);

  const tabButton = (route: { key: string; name: string }, i: number) => {
    const t = TABS[route.name];
    if (!t) return null;
    const focused = state.index === i;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={t.label}
        onPress={() => {
          tap();
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.tab}
      >
        <View style={[styles.iconPill, focused && { backgroundColor: colors.brandSoft }]}>
          <Ionicons name={focused ? t.active : t.icon} size={22} color={focused ? colors.primaryDark : colors.muted} />
        </View>
        <Text style={[styles.label, { color: focused ? colors.primaryDark : colors.muted, fontFamily: focused ? font.bold : font.semibold }]}>{t.label}</Text>
      </Pressable>
    );
  };

  const go = (fn: () => void) => () => fn();

  return (
    <>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.row}>
        {state.routes.slice(0, 2).map((r, i) => tabButton(r, i))}
        <View style={styles.tab}>
          <Pressable
            onPress={() => {
              tap();
              setMenu(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Create"
            style={({ pressed }) => [styles.create, pressed && { transform: [{ scale: 0.94 }] }]}
          >
            <Ionicons name="add" size={30} color={colors.white} />
          </Pressable>
        </View>
        {state.routes.slice(2).map((r, i) => tabButton(r, i + 2))}
        </View>
      </View>
      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        items={[
          { label: 'Ask for help', icon: 'help-buoy-outline', onPress: go(() => router.push('/post/new')) },
          { label: 'Sell or rent an item', icon: 'pricetag-outline', onPress: go(() => requireVerified(me) && router.push('/listing/new')) },
          { label: 'Find a tutor', icon: 'school-outline', onPress: go(() => router.navigate({ pathname: '/(tabs)', params: { filter: 'tutors' } })) },
          me.tutor_status === 'approved'
            ? { label: 'Offer tutoring', icon: 'megaphone-outline', onPress: go(() => router.push('/post/new')) }
            : { label: 'Become a tutor', icon: 'ribbon-outline', onPress: go(() => router.push('/become-tutor')) },
        ]}
      />
    </>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    bar: {
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 6,
    },
    // On wide screens the five buttons stay together in the middle instead of spreading across the screen.
    row: { ...centered(560), flexDirection: 'row', alignItems: 'flex-end' },
    tab: { flex: 1, alignItems: 'center', gap: 2 },
    // overflow hidden makes Android clip the highlight to its rounded shape, like on iPhone
    iconPill: { width: 54, height: 30, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    label: { fontSize: 11 },
    create: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginTop: -22,
      marginBottom: 6,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 4,
      borderColor: colors.surface,
      ...elevation(),
      shadowOpacity: 0.25,
    },
  }),
);
