import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { Screen } from '@/components/Screen';
import { Button, Field, Text } from '@/components/ui';
import { notify } from '@/lib/actions';
import { supabase } from '@/lib/supabase';

// 2.1 · Log In
export default function LogIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return notify('Enter your email and password');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) return notify('Log in failed', error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message);
    router.replace('/(tabs)');
  };

  return (
    <Screen back>
      <View style={{ alignItems: 'center', gap: 6, marginVertical: 24 }}>
        <Mascot size={110} />
        <Text variant="h1">Welcome back!</Text>
        <Text variant="muted">Log in to continue to PASA</Text>
      </View>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" icon="mail-outline" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" icon="lock-closed-outline" onSubmitEditing={submit} />
      <Button title="Forgot password?" variant="ghost" small style={{ alignSelf: 'flex-end' }} onPress={() => router.push('/forgot-password')} />
      <Button title="Log In" onPress={submit} loading={loading} />
      <Button title="New here? Create an account" variant="ghost" onPress={() => router.replace('/sign-up')} />
    </Screen>
  );
}
