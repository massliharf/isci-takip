import { View } from 'react-native';
import { Button, Card, IconBox, Screen, Text } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { confirmAction } from '../../lib/dialog';
import { supabase } from '../../lib/supabase';
import { categoryTone, space } from '../../theme/tokens';

export default function SettingsScreen() {
  const { session } = useAuth();
  const meta = session?.user.user_metadata ?? {};

  return (
    <Screen>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <IconBox icon="user" {...categoryTone.worker} size={48} />
        <View style={{ flex: 1 }}>
          <Text variant="title">{meta.full_name || 'Kullanıcı'}</Text>
          {meta.business_name ? (
            <Text variant="caption" tone="secondary">
              {meta.business_name}
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary">
            {session?.user.email}
          </Text>
        </View>
      </Card>
      <Button
        title="Çıkış yap"
        icon="log-out"
        variant="danger"
        onPress={() =>
          confirmAction({
            title: 'Çıkış',
            message: 'Hesabınızdan çıkış yapılsın mı?',
            confirmText: 'Çıkış yap',
            onConfirm: () => supabase.auth.signOut().then(() => undefined),
          })
        }
      />
    </Screen>
  );
}
