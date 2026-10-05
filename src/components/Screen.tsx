import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, space, themed } from '@/theme';
import { centered, WIDTH } from '@/lib/layout';
import { Text } from './ui';

type Props = {
  children: ReactNode;
  title?: string;
  /** Show a back button in the header. */
  back?: boolean;
  right?: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  padded?: boolean;
};

/** Standard page: safe area, optional header, scrolling body and a sticky footer for main actions. */
export function Screen({ children, title, back, right, scroll = true, refreshing, onRefresh, footer, padded = true }: Props) {
  const insets = useSafeAreaInsets();
  // On tablets and laptops the page content sits in a centered column, so forms and text don't stretch edge to edge.
  const body = [padded ? { padding: space(4), gap: space(4) } : undefined, styles.column];
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      {(title || back) && (
        <View style={[styles.header, { paddingTop: insets.top + 26 }]}>
          {back ? (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={12}
              accessibilityLabel="Go back"
              style={styles.headerBtn}
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.headerBtn} />
          )}
          <Text numberOfLines={1} style={styles.headerTitle}>
            {title}
          </Text>
          <View style={[styles.headerBtn, { alignItems: 'flex-end' }]}>{right}</View>
        </View>
      )}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[...body, { paddingBottom: footer ? space(4) : insets.bottom + space(6) }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, ...body]}>{children}</View>
      )}
      {footer && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space(3) }]}>
          <View style={[styles.column, { gap: space(2) }]}>{footer}</View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = themed(() => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space(3),
    paddingBottom: space(3),
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  column: centered(WIDTH.form),
  headerBtn: { width: 64, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: font.bold, fontSize: 17 },
  footer: {
    paddingHorizontal: space(4),
    paddingTop: space(3),
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space(2),
  },
}));
