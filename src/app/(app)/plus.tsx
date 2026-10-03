import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Logo } from '@/components/Logo';
import { Screen } from '@/components/Screen';
import { Button, Card, Row, Text, type IconName } from '@/components/ui';
import { confirm, notify } from '@/lib/actions';
import { useMe } from '@/lib/auth';
import { daysFromNow, isPlus, peso, shortDate } from '@/lib/format';
import { PLUS_PLANS, useSettings } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { colors, font, radius } from '@/theme';

// 3.10 · Boost a post/listing, or subscribe to PASA Plus (1-month free trial, then 1/3/6/12-month plans)
export default function Plus() {
  const { boost, id } = useLocalSearchParams<{ boost?: 'post' | 'listing'; id?: string }>();
  const { me, refreshProfile } = useMe();
  const { settings } = useSettings();
  const plus = isPlus(me);
  const [busy, setBusy] = useState(false);
  const [months, setMonths] = useState(1);
  const freeBoost = plus && me.plus_boosts_left > 0;

  const perks: { icon: IconName; text: string }[] = [
    { icon: 'flash-outline', text: `${settings.plus_boosts} boosts every month for your posts and listings` },
    { icon: 'pricetag-outline', text: `Service fee drops by ${settings.plus_discount}% (${settings.commission_rate}% → ${Math.max(0, settings.commission_rate - settings.plus_discount)}%)` },
    { icon: 'star-outline', text: 'PASA Plus badge on your profile' },
  ];

  const boostNow = async () => {
    if (!boost || !id) return;
    if (!freeBoost) return router.push({ pathname: '/checkout', params: { type: 'boost', target: boost, id } });
    setBusy(true);
    const [{ error }] = await Promise.all([
      supabase.from(boost === 'post' ? 'posts' : 'listings').update({ boosted_until: daysFromNow(settings.boost_days) }).eq('id', id),
      supabase.from('profiles').update({ plus_boosts_left: me.plus_boosts_left - 1 }).eq('id', me.id),
    ]);
    setBusy(false);
    if (error) return notify('Could not boost', error.message);
    await refreshProfile();
    toast(`Boosted for ${settings.boost_days} days · ${me.plus_boosts_left - 1} boosts left`);
    router.back();
  };

  const startTrial = async () => {
    if (!(await confirm('Start your free month?', `You get PASA Plus free for 1 month, including ${settings.plus_boosts} boosts. No payment needed.`, 'Start trial'))) return;
    setBusy(true);
    const { error } = await supabase
      .from('profiles')
      .update({ plus_until: daysFromNow(30), plus_trial_used: true, plus_boosts_left: settings.plus_boosts })
      .eq('id', me.id);
    setBusy(false);
    if (error) return notify('Could not start trial', error.message);
    await refreshProfile();
    toast('Welcome to PASA Plus! Your free month has started.');
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
            <Text style={{ fontFamily: font.black, fontSize: 18 }}>{freeBoost ? 'FREE' : peso(settings.boost_price)}</Text>
          </Row>
          <Text variant="muted">
            Pinned at the top of {boost === 'post' ? 'the Home feed' : 'Assets'} for {settings.boost_days} days.
            {freeBoost ? ` Uses 1 of your ${me.plus_boosts_left} Plus boosts.` : ''}
          </Text>
          <Button title={freeBoost ? 'Use a Plus boost' : `Boost for ${peso(settings.boost_price)}`} icon="flash" onPress={boostNow} loading={busy} />
        </Card>
      )}

      <Card style={{ gap: 14, alignItems: 'center' }}>
        <Logo size={96} variant="gold" />
        <Text variant="h2">PASA Plus</Text>
        <View style={{ gap: 10, alignSelf: 'stretch' }}>
          {perks.map((p) => (
            <Row key={p.text}>
              <Ionicons name={p.icon} size={20} color={colors.primary} />
              <Text style={{ flex: 1 }}>{p.text}</Text>
            </Row>
          ))}
        </View>
        {plus && (
          <Text variant="label" style={{ color: colors.success, textAlign: 'center' }}>
            You're a Plus member until {shortDate(me.plus_until!)} · {me.plus_boosts_left} boosts left
          </Text>
        )}
      </Card>

      {!plus && !me.plus_trial_used && (
        <Card style={{ gap: 8, backgroundColor: colors.successSoft, borderColor: colors.successSoft }}>
          <Text variant="title">Try it free for 1 month</Text>
          <Text variant="muted">All Plus perks including {settings.plus_boosts} boosts. No payment needed.</Text>
          <Button title="Start free trial" icon="gift-outline" onPress={startTrial} loading={busy} />
        </Card>
      )}

      <Text variant="label">{plus ? 'Extend your membership' : 'Choose a plan'}</Text>
      {PLUS_PLANS.map((p) => {
        const price = settings[p.key];
        const perMonth = Math.round(price / p.months);
        const selected = months === p.months;
        return (
          <Pressable key={p.months} onPress={() => setMonths(p.months)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 14,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.primary : colors.border,
              }}
            >
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="title">{p.label}</Text>
                <Text variant="muted">
                  {peso(perMonth)}/month · {settings.plus_boosts * p.months} boosts
                </Text>
              </View>
              <Text style={{ fontFamily: font.black, fontSize: 18 }}>{peso(price)}</Text>
            </View>
          </Pressable>
        );
      })}
      <Button
        title={`${plus ? 'Extend' : 'Subscribe'} · ${peso(settings[PLUS_PLANS.find((p) => p.months === months)!.key])}`}
        onPress={() => router.push({ pathname: '/checkout', params: { type: 'plus', months: String(months) } })}
      />
    </Screen>
  );
}
