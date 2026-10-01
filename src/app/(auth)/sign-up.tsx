import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Screen } from '@/components/Screen';
import { Button, Card, ChipSelect, Field, Text } from '@/components/ui';
import { PROGRAMS, SCHOOL_EMAIL_DOMAIN, SCHOOL_NAME, YEAR_LEVELS } from '@/config';
import { notify } from '@/lib/actions';
import { yearLabel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

// 2 · Create your account
export default function SignUp() {
  const [form, setForm] = useState({ first: '', last: '', email: '', password: '' });
  const [program, setProgram] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first.trim()) e.first = 'Enter your first name';
    if (!form.last.trim()) e.last = 'Enter your last name';
    if (!program) e.program = 'Choose your program';
    if (!year) e.year = 'Choose your year level';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    else if (SCHOOL_EMAIL_DOMAIN && !form.email.trim().toLowerCase().endsWith(`@${SCHOOL_EMAIL_DOMAIN}`))
      e.email = `Use your school email (@${SCHOOL_EMAIL_DOMAIN}) so we know you're a student`;
    if (form.password.length < 8) e.password = 'Use at least 8 characters';
    if (!agreed) e.agreed = 'Please agree to continue';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { first_name: form.first.trim(), last_name: form.last.trim(), school: SCHOOL_NAME, program, year_level: year },
      },
    });
    setLoading(false);
    if (error) return notify('Sign up failed', error.message);
    if (!data.session) {
      notify('Check your email', 'We sent a verification link to your school email. Open it, then log in.');
      return router.replace('/log-in');
    }
    router.replace('/profile-setup');
  };

  return (
    <Screen back title="Create your account" footer={<Button title="Sign Up" onPress={submit} loading={loading} />}>
      <Field label="First name" value={form.first} onChangeText={set('first')} error={errors.first} autoComplete="given-name" />
      <Field label="Last name" value={form.last} onChangeText={set('last')} error={errors.last} autoComplete="family-name" />
      <Field label="School / University" value={SCHOOL_NAME} editable={false} icon="school-outline" />
      <ChipSelect label="Program / Course" options={PROGRAMS} value={program} onChange={setProgram} />
      {errors.program && <Text style={{ color: colors.danger, fontSize: 12.5, marginTop: -8 }}>{errors.program}</Text>}
      <ChipSelect label="Year level" options={YEAR_LEVELS} value={year} onChange={setYear} format={yearLabel} />
      {errors.year && <Text style={{ color: colors.danger, fontSize: 12.5, marginTop: -8 }}>{errors.year}</Text>}
      <Field
        label="Email address"
        placeholder={SCHOOL_EMAIL_DOMAIN ? `you@${SCHOOL_EMAIL_DOMAIN}` : 'you@school.edu.ph'}
        value={form.email}
        onChangeText={set('email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        icon="mail-outline"
      />
      <Field
        label="Password"
        value={form.password}
        onChangeText={set('password')}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
        icon="lock-closed-outline"
      />
      <Pressable onPress={() => setAgreed((a) => !a)}>
        <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderColor: errors.agreed ? colors.danger : colors.border }}>
          <Ionicons name={agreed ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
          <Text variant="muted" style={{ flex: 1 }}>
            I agree to PASA's Terms and Community Rules, and consent to the processing of my data under the Data Privacy Act of 2012.
          </Text>
        </Card>
      </Pressable>
    </Screen>
  );
}
