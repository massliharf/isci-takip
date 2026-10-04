import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ErrorText, Field, FormStack, IconBox, Screen, Text } from '../../components/ui';
import { showMessage } from '../../lib/dialog';
import { supabase } from '../../lib/supabase';
import { categoryTone, palette, space } from '../../theme/tokens';

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
    else showMessage('E-posta gönderildi', 'Şifre sıfırlama bağlantısı e-postanıza gönderildi.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bgApp }}>
      <Screen>
        <View style={{ alignItems: 'center', gap: space.md, marginTop: space.xxl * 2, marginBottom: space.lg }}>
          <IconBox icon="check-square" {...categoryTone.worker} size={56} />
          <Text variant="display" align="center">
            İşçi Takip
          </Text>
          <Text variant="body" tone="secondary" align="center">
            Puantaj, yevmiye ve alacak-verecek tek yerde
          </Text>
        </View>
        <Card>
          <FormStack>
            <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
            <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
            <ErrorText>{error}</ErrorText>
            <Button title="Giriş yap" size="lg" onPress={signIn} loading={busy} disabled={!email || !password} />
            <Button title="Şifremi unuttum" variant="ghost" size="sm" onPress={resetPassword} />
          </FormStack>
        </Card>
        <Button title="Hesabın yok mu? Üye ol" variant="secondary" onPress={() => router.push('/register')} />
      </Screen>
    </SafeAreaView>
  );
}
