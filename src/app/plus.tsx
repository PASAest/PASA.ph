import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Button, Card, Row, Text, type IconName } from '@/components/ui';
import { BOOST_DAYS, BOOST_PRICE, PLUS_PRICE, PLUS_SERVICE_FEE_RATE, SERVICE_FEE_RATE } from '@/config';
import { notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { daysFromNow, isPlus, peso, shortDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, font } from '@/theme';

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'pricetag-outline', text: `Service fee drops from ${SERVICE_FEE_RATE * 100}% to ${PLUS_SERVICE_FEE_RATE * 100}%` },
  { icon: 'flash-outline', text: 'Unlimited free boosts on your posts and listings' },
  { icon: 'star-outline', text: 'PASA Plus badge on your profile' },
];

// 3.10 · Boost a post/listing, or subscribe to PASA Plus
export default function Plus() {
  const { boost, id } = useLocalSearchParams<{ boost?: 'post' | 'listing'; id?: string }>();
  const { me } = useMe();
  const plus = isPlus(me);
  const [boosting, setBoosting] = useState(false);

  const boostNow = async () => {
    if (!boost || !id) return;
    if (!plus) return router.push({ pathname: '/checkout', params: { type: 'boost', target: boost, id } });
    // Plus members boost for free.
    setBoosting(true);
    const until = daysFromNow(BOOST_DAYS);
    const { error } = await supabase.from(boost === 'post' ? 'posts' : 'listings').update({ boosted_until: until }).eq('id', id);
    setBoosting(false);
    if (error) return notify('Could not boost', error.message);
    notify('Boosted!', `Your ${boost} stays at the top for ${BOOST_DAYS} days.`);
    router.back();
  };

  return (
    <Screen back title={boost ? 'Boost' : 'PASA Plus'}>
      {boost && (
        <Card style={{ gap: 10, borderColor: colors.warning, borderWidth: 2 }}>
          <Row>
            <Ionicons name="flash" size={24} color={colors.warning} />
            <Text variant="title" style={{ flex: 1 }}>
              Boost this {boost}
            </Text>
            <Text style={{ fontFamily: font.black, fontSize: 18 }}>{plus ? 'FREE' : peso(BOOST_PRICE)}</Text>
          </Row>
          <Text variant="muted">
            Your {boost} is pinned at the top of {boost === 'post' ? 'the Home feed' : 'Assets'} for {BOOST_DAYS} days so more students see it.
          </Text>
          <Button title={plus ? 'Boost for free' : `Boost for ${peso(BOOST_PRICE)}`} icon="flash" onPress={boostNow} loading={boosting} />
        </Card>
      )}
      <Card style={{ gap: 14, alignItems: 'center' }}>
        <Mascot size={90} waving />
        <Text variant="h2">PASA Plus</Text>
        <Text style={{ fontFamily: font.black, fontSize: 28, color: colors.primaryDark }}>
          {peso(PLUS_PRICE)}
          <Text variant="muted"> / month</Text>
        </Text>
        <View style={{ gap: 10, alignSelf: 'stretch' }}>
          {PERKS.map((p) => (
            <Row key={p.text}>
              <Ionicons name={p.icon} size={20} color={colors.primary} />
              <Text style={{ flex: 1 }}>{p.text}</Text>
            </Row>
          ))}
        </View>
        {plus ? (
          <Text variant="label" style={{ color: colors.success }}>
            You're a Plus member until {shortDate(me.plus_until!)} 🎉
          </Text>
        ) : (
          <Button title="Subscribe" style={{ alignSelf: 'stretch' }} onPress={() => router.push({ pathname: '/checkout', params: { type: 'plus' } })} />
        )}
      </Card>
    </Screen>
  );
}
