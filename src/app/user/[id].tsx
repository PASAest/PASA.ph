import { Redirect, useLocalSearchParams } from 'expo-router';
import { ProfileView, useProfileData } from '@/components/ProfileView';
import { Screen } from '@/components/Screen';
import { useMe } from '@/lib/auth';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useMe();
  const { data, reload, refreshing, refresh } = useProfileData(id);
  if (id === me?.id) return <Redirect href="/(tabs)/profile" />;
  return (
    <Screen back title={data ? data.profile.first_name : ''} refreshing={refreshing} onRefresh={refresh}>
      <ProfileView data={data} reload={reload} />
    </Screen>
  );
}
