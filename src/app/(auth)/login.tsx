import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button, Card, colors, ErrorText, Field, Muted, Screen } from '../../components/ui';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı' : error.message);
  }

  async function resetPassword() {
    if (!email.trim()) return setError('Önce e-posta adresinizi yazın');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) setError(error.message);
    else Alert.alert('E-posta gönderildi', 'Şifre sıfırlama bağlantısı e-postanıza gönderildi.');
  }

  return (
    <Screen>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary, marginTop: 24 }}>İşçi Takip</Text>
      <Muted>Puantaj, yevmiye ve alacak-verecek takibi</Muted>
      <Card>
        <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        <ErrorText>{error}</ErrorText>
        <Button title="Giriş Yap" onPress={signIn} loading={busy} disabled={!email || !password} />
        <Text onPress={resetPassword} style={{ color: colors.blue, textAlign: 'center', marginTop: 14 }}>
          Şifremi unuttum
        </Text>
      </Card>
      <Link href="/register" style={{ color: colors.blue, textAlign: 'center', fontSize: 16 }}>
        Hesabın yok mu? Üye ol
      </Link>
    </Screen>
  );
}
