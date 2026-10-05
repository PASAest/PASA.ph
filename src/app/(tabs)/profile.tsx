import { RefreshControl, ScrollView, View } from 'react-native';
import { AppBar } from '@/components/AppBar';
import { ProfileView, useProfileData } from '@/components/ProfileView';
import { useMe } from '@/lib/auth';
import { centered, WIDTH } from '@/lib/layout';
import { colors, space } from '@/theme';

export default function MyProfile() {
  const { me } = useMe();
  const { data, reload, refreshing, refresh } = useProfileData(me.id);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppBar />
      <ScrollView
        contentContainerStyle={[centered(WIDTH.feed), { padding: space(4), paddingTop: space(2) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <ProfileView data={data} reload={reload} />
      </ScrollView>
    </View>
  );
}
