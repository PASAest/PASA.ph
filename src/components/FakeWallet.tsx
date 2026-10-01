import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { peso } from '@/lib/format';
import { colors, font, radius, space } from '@/theme';
import { Button, DemoBanner, Text } from './ui';

export type PayMethod = 'gcash' | 'maya' | 'cash';

export const METHODS: Record<PayMethod, { label: string; color: string; icon: 'wallet' | 'card' | 'cash' }> = {
  gcash: { label: 'GCash', color: '#007DFE', icon: 'wallet' },
  maya: { label: 'Maya', color: '#00B464', icon: 'card' },
  cash: { label: 'Cash on meetup', color: colors.success, icon: 'cash' },
};

/**
 * Simulated e-wallet checkout. Accepts any 4 digits as the PIN. No real money moves.
 * Calls onPaid once the fake "processing" step finishes; onPaid does the database work.
 */
export function FakeWallet({
  visible,
  method,
  amount,
  onPaid,
  onClose,
}: {
  visible: boolean;
  method: PayMethod;
  amount: number;
  onPaid: () => Promise<string | null>;
  onClose: (success: boolean) => void;
}) {
  // Mounted fresh for each payment, so state starts clean every time.
  const [step, setStep] = useState<'pin' | 'processing' | 'done'>(method === 'cash' ? 'processing' : 'pin');
  const [pin, setPin] = useState('');
  const [ref, setRef] = useState<string | null>(null);
  const m = METHODS[method];

  useEffect(() => {
    if (step !== 'processing' || !visible) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await onPaid();
      if (cancelled) return;
      if (r) {
        setRef(r);
        setStep('done');
      } else onClose(false);
    }, 1400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => step !== 'processing' && onClose(step === 'done')}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={[styles.brand, { backgroundColor: m.color }]}>
            <Ionicons name={m.icon} size={22} color={colors.white} />
            <Text style={{ fontFamily: font.black, color: colors.white, fontSize: 18 }}>{m.label}</Text>
          </View>
          <View style={{ padding: space(5), gap: space(4) }}>
            <DemoBanner />
            {step === 'pin' && (
              <>
                <Text style={{ textAlign: 'center' }} variant="muted">
                  Pay PASA
                </Text>
                <Text style={{ textAlign: 'center', fontFamily: font.black, fontSize: 32 }}>{peso(amount)}</Text>
                <Text variant="label" style={{ textAlign: 'center' }}>
                  Enter any 4-digit demo PIN
                </Text>
                <TextInput
                  value={pin}
                  onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  secureTextEntry
                  autoFocus
                  maxLength={4}
                  style={styles.pin}
                  placeholder="••••"
                  placeholderTextColor={colors.border}
                />
                <Button title={`Pay ${peso(amount)}`} disabled={pin.length < 4} onPress={() => setStep('processing')} style={{ backgroundColor: m.color, borderColor: m.color }} />
                <Pressable onPress={() => onClose(false)}>
                  <Text style={{ textAlign: 'center', color: colors.muted }}>Cancel</Text>
                </Pressable>
              </>
            )}
            {step === 'processing' && (
              <View style={{ alignItems: 'center', gap: 12, paddingVertical: space(6) }}>
                <ActivityIndicator size="large" color={m.color} />
                <Text variant="title">{method === 'cash' ? 'Confirming…' : 'Processing payment…'}</Text>
              </View>
            )}
            {step === 'done' && (
              <View style={{ alignItems: 'center', gap: 10 }}>
                <Ionicons name="checkmark-circle" size={72} color={colors.success} />
                <Text variant="h2">{method === 'cash' ? 'Booked!' : 'Payment successful'}</Text>
                <Text variant="muted" style={{ textAlign: 'center' }}>
                  {method === 'cash'
                    ? `Pay ${peso(amount)} in cash at the meetup.`
                    : `${peso(amount)} is held safely by PASA until you confirm.`}
                </Text>
                <Text style={{ fontFamily: font.bold }}>Ref. No. {ref}</Text>
                <Button title="Done" onPress={() => onClose(true)} style={{ alignSelf: 'stretch' }} />
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(22,50,74,0.45)', justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 430, alignSelf: 'center', backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden', paddingBottom: space(6) },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: space(4) },
  pin: {
    alignSelf: 'center',
    width: 180,
    textAlign: 'center',
    fontSize: 30,
    letterSpacing: 16,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: 8,
    color: colors.text,
    outlineStyle: 'none',
  } as object,
});
