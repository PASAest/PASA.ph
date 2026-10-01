import { useState } from 'react';
import { Screen } from '@/components/Screen';
import { Button, Field, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);
    if (error) return notify('Something went wrong', error.message);
    notify('Check your email', 'If that email has a PASA account, we sent a link to reset your password.');
  };

  return (
    <Screen back title="Reset password">
      <Text variant="muted">Enter the email you signed up with and we'll send you a reset link.</Text>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
      <Button title="Send reset link" onPress={submit} loading={loading} />
    </Screen>
  );
}
