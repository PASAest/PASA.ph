import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { notify } from '@/lib/actions';
import { useAuth } from '@/lib/auth';
import { success, warn } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { colors, space } from '@/theme';
import { PinPad } from './PinPad';
import { Screen } from './Screen';
import { Button, Card, Field, Loading, Text } from './ui';

// Once unlocked, the wallet stays open for a few minutes so moving around the app doesn't ask again.
const UNLOCK_MS = 5 * 60 * 1000;
let unlockedUntil = 0;

type PinResult = { ok: boolean; error?: string; attempts_left?: number; locked_until?: string | null };
type Step =
  | { kind: 'loading' }
  | { kind: 'enter' }
  | { kind: 'locked'; until: string }
  | { kind: 'password' }
  /** New PIN. `current` is set when changing it from inside the wallet. */
  | { kind: 'create'; current?: string; reset?: boolean }
  | { kind: 'confirm'; first: string; current?: string; reset?: boolean }
  | { kind: 'current' }
  | { kind: 'unlocked' };

const wrongMessage = (r: PinResult) => (r.attempts_left ? `Wrong PIN. ${r.attempts_left} ${r.attempts_left === 1 ? 'try' : 'tries'} left.` : 'Wrong PIN.');
const minutesLeft = (until: string) => Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 60000));

/**
 * Asks for the wallet PIN before showing the wallet (and has the user create one the first time).
 * `children` gets a function that starts the "Change PIN" flow.
 */
export function WalletLock({ children }: { children: (changePin: () => void) => ReactNode }) {
  const { session } = useAuth();
  const [step, setStep] = useState<Step>(() => (Date.now() < unlockedUntil ? { kind: 'unlocked' } : { kind: 'loading' }));
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0); // new key for the pad after each try, so it starts empty
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');

  const go = (next: Step, message = '') => {
    setStep(next);
    setError(message);
    setAttempt((a) => a + 1);
  };

  const checkStatus = () =>
    supabase.rpc('wallet_pin_status').then(({ data, error: e }) => {
      if (e) return go({ kind: 'enter' }, 'Couldn’t check your PIN. Pull to try again.');
      const s = data as { status: 'none' | 'set' | 'locked'; locked_until: string | null };
      if (s.status === 'none') go({ kind: 'create' });
      else if (s.status === 'locked') go({ kind: 'locked', until: s.locked_until! });
      else go({ kind: 'enter' });
    });

  useEffect(() => {
    if (step.kind === 'loading') checkStatus();
    // Only on first open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlock = () => {
    unlockedUntil = Date.now() + UNLOCK_MS;
    success();
    go({ kind: 'unlocked' });
  };

  const enter = async (pin: string) => {
    setBusy(true);
    const { data, error: e } = await supabase.rpc('verify_wallet_pin', { pin });
    setBusy(false);
    if (e) return go({ kind: 'enter' }, e.message);
    const r = data as PinResult;
    if (r.ok) return unlock();
    warn();
    if (r.locked_until) return go({ kind: 'locked', until: r.locked_until });
    go({ kind: 'enter' }, wrongMessage(r));
  };

  const save = async (pin: string, current?: string, reset?: boolean) => {
    setBusy(true);
    const { data, error: e } = await supabase.rpc('set_wallet_pin', current ? { new_pin: pin, current_pin: current } : { new_pin: pin });
    setBusy(false);
    const r = (data as PinResult | null) ?? { ok: false, error: e?.message };
    if (r.ok) {
      toast(current ? 'Wallet PIN changed' : reset ? 'New wallet PIN saved' : 'Wallet PIN created');
      return unlock();
    }
    warn();
    if (r.locked_until) return go({ kind: 'locked', until: r.locked_until });
    if (current) return go({ kind: 'current' }, r.attempts_left !== undefined ? wrongMessage(r) : (r.error ?? 'Couldn’t change your PIN.'));
    go({ kind: 'create', reset }, r.error ?? 'Couldn’t save your PIN. Try again.');
  };

  const confirmPassword = async () => {
    const email = session?.user.email;
    if (!email || !password) return notify('Enter your password');
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setPassword('');
    if (e) return notify('Wrong password', 'Check your password and try again.');
    go({ kind: 'create', reset: true });
  };

  if (step.kind === 'unlocked') return <>{children(() => go({ kind: 'current' }))}</>;

  const forgot = (
    <Button title="Forgot PIN?" variant="ghost" small onPress={() => go({ kind: 'password' })} style={{ marginTop: space(2) }} />
  );
  const cancelChange = <Button title="Cancel" variant="ghost" small onPress={() => go({ kind: 'unlocked' })} style={{ marginTop: space(2) }} />;

  return (
    <Screen back title="Wallet">
      {step.kind === 'loading' && <Loading />}

      {step.kind === 'enter' && (
        <PinPad key={attempt} title="Enter your wallet PIN" subtitle="Your wallet is protected with a 4-digit PIN." error={error} busy={busy} onComplete={enter} footer={forgot} />
      )}

      {step.kind === 'current' && (
        <PinPad key={attempt} title="Enter your current PIN" error={error} busy={busy} onComplete={(pin) => go({ kind: 'create', current: pin })} footer={cancelChange} />
      )}

      {step.kind === 'create' && (
        <PinPad
          key={attempt}
          title={step.current ? 'Choose a new PIN' : step.reset ? 'Set a new wallet PIN' : 'Create a wallet PIN'}
          subtitle={step.current || step.reset ? undefined : 'You’ll enter this 4-digit PIN each time you open your wallet.'}
          error={error}
          busy={busy}
          onComplete={(pin) => go({ kind: 'confirm', first: pin, current: step.current, reset: step.reset })}
          footer={step.current ? cancelChange : undefined}
        />
      )}

      {step.kind === 'confirm' && (
        <PinPad
          key={attempt}
          title="Enter it again to confirm"
          error={error}
          busy={busy}
          onComplete={(pin) =>
            pin === step.first ? save(pin, step.current, step.reset) : go({ kind: 'create', current: step.current, reset: step.reset }, 'The PINs didn’t match. Try again.')
          }
          footer={step.current ? cancelChange : undefined}
        />
      )}

      {step.kind === 'locked' && (
        <Card style={{ gap: space(3), alignItems: 'center', marginTop: space(6) }}>
          <Text variant="h2" style={{ textAlign: 'center' }}>
            Wallet locked
          </Text>
          <Text variant="muted" style={{ textAlign: 'center' }}>
            Too many wrong PINs. Try again in {minutesLeft(step.until)} minute{minutesLeft(step.until) === 1 ? '' : 's'}, or reset your PIN with your account password.
          </Text>
          <Button title="Try again" variant="outline" onPress={checkStatus} style={{ alignSelf: 'stretch' }} />
          <Button title="Reset PIN with password" onPress={() => go({ kind: 'password' })} style={{ alignSelf: 'stretch' }} />
        </Card>
      )}

      {step.kind === 'password' && (
        <View style={{ gap: space(3), marginTop: space(4) }}>
          <Text variant="h2">Reset your wallet PIN</Text>
          <Text variant="muted">Enter your PASA account password ({session?.user.email}) to set a new PIN.</Text>
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" icon="lock-closed-outline" />
          <Button title="Continue" onPress={confirmPassword} loading={busy} />
          <Button title="Back" variant="ghost" onPress={checkStatus} />
          <Text variant="muted" style={{ fontSize: 12.5, color: colors.muted }}>
            Forgot your account password too? Log out and use “Forgot password?” on the log in screen.
          </Text>
        </View>
      )}
    </Screen>
  );
}
