import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, Card, ErrorText, Field, FormStack, Screen } from '../../components/ui';
import { supabase } from '../../lib/supabase';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signUp() {
    if (password.length < 6) return setError('Şifre en az 6 karakter olmalı');
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), business_name: businessName.trim() } },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (!data.session) {
      Alert.alert('Üyelik oluşturuldu', 'E-postanıza gelen doğrulama bağlantısına tıklayıp giriş yapın.');
      router.back();
    }
  }

  return (
    <Screen>
      <Card>
        <FormStack>
          <Field label="Ad soyad" value={fullName} onChangeText={setFullName} />
          <Field label="İşletme / firma adı" value={businessName} onChangeText={setBusinessName} placeholder="Örn. Yılmaz Duvar Ustalık" />
          <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 6 karakter" />
          <ErrorText>{error}</ErrorText>
          <Button title="Üye ol" size="lg" onPress={signUp} loading={busy} disabled={!email || !password || !fullName} />
        </FormStack>
      </Card>
    </Screen>
  );
}
