import { Alert, Text } from 'react-native';
import { Button, Card, Muted, Screen } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const { session } = useAuth();
  const meta = session?.user.user_metadata ?? {};

  return (
    <Screen>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>{meta.full_name || 'Kullanıcı'}</Text>
        {meta.business_name ? <Muted>{meta.business_name}</Muted> : null}
        <Muted>{session?.user.email}</Muted>
      </Card>
      <Button
        title="Çıkış Yap"
        variant="danger"
        onPress={() =>
          Alert.alert('Çıkış', 'Hesabınızdan çıkış yapılsın mı?', [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Çıkış Yap', style: 'destructive', onPress: () => supabase.auth.signOut() },
          ])
        }
      />
    </Screen>
  );
}
