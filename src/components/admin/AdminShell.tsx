import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { colors, font, radius, space, themed } from '@/theme';
import { Logo } from '../Logo';
import { Text, type IconName } from '../ui';

const NAV: { href: Href; path: string; label: string; icon: IconName }[] = [
  { href: '/admin', path: '/admin', label: 'Dashboard', icon: 'stats-chart-outline' },
  { href: '/admin/approvals', path: '/admin/approvals', label: 'Approvals', icon: 'checkmark-done-outline' },
  { href: '/admin/reports', path: '/admin/reports', label: 'Reports', icon: 'flag-outline' },
  { href: '/admin/users', path: '/admin/users', label: 'Users', icon: 'people-outline' },
  { href: '/admin/content', path: '/admin/content', label: 'Listings & posts', icon: 'library-outline' },
  { href: '/admin/payments', path: '/admin/payments', label: 'Payments & payouts', icon: 'wallet-outline' },
  { href: '/admin/settings', path: '/admin/settings', label: 'Settings', icon: 'settings-outline' },
];

/** Admin layout: sidebar on wide screens, scrolling tab row on phones. */
export function AdminShell({ children, counts }: { children: ReactNode; counts: Record<string, number> }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const wide = width >= 900;

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/admin');
  };

  const items = NAV.map((n) => {
    const active = path === n.path;
    return (
      <Pressable
        key={n.path}
        onPress={() => router.replace(n.href)}
        style={(state) => [
          wide ? styles.sideItem : styles.tabItem,
          active && { backgroundColor: colors.brandSoft },
          // `hovered` exists on web only
          (state as { hovered?: boolean }).hovered && !active && { backgroundColor: colors.bg },
        ]}
      >
        <Ionicons name={n.icon} size={19} color={active ? colors.primaryDark : colors.muted} />
        <Text style={{ fontFamily: active ? font.bold : font.semibold, color: active ? colors.primaryDark : colors.text, flex: wide ? 1 : undefined }}>
          {n.label}
        </Text>
        {(counts[n.path] ?? 0) > 0 && (
          <View style={styles.count}>
            <Text style={{ color: colors.white, fontFamily: font.bold, fontSize: 11 }}>{counts[n.path]}</Text>
          </View>
        )}
      </Pressable>
    );
  });

  const brand = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Logo size={30} />
      <Text style={{ fontFamily: font.black, fontSize: 20, color: colors.primaryDark }}>PASA</Text>
      <View style={styles.adminTag}>
        <Text style={{ fontFamily: font.bold, fontSize: 11, color: colors.primaryDark }}>ADMIN</Text>
      </View>
    </View>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
        <View style={styles.sidebar}>
          {brand}
          <View style={{ gap: 4, marginTop: space(6), flex: 1 }}>{items}</View>
          <Pressable onPress={signOut} style={styles.sideItem}>
            <Ionicons name="log-out-outline" size={19} color={colors.muted} />
            <Text style={{ color: colors.muted }}>Sign out</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {brand}
          <Pressable onPress={signOut} hitSlop={10} accessibilityLabel="Sign out">
            <Ionicons name="log-out-outline" size={22} color={colors.muted} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: space(3) }}>
          {items}
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/** Page frame inside the admin shell: title, optional actions, scrolling body. */
export function AdminPage({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <ScrollView contentContainerStyle={{ padding: space(6), gap: space(5), maxWidth: 1200, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text variant="h1">{title}</Text>
          {subtitle && <Text variant="muted">{subtitle}</Text>}
        </View>
        {actions && <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{actions}</View>}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = themed(() => StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: space(5),
  },
  sideItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.sm },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  topbar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: space(4), paddingBottom: space(3) },
  adminTag: { backgroundColor: colors.brandSoft, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  count: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
}));
