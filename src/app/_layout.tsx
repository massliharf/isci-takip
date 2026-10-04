import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { Geist_700Bold } from '@expo-google-fonts/geist/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { EmptyState, Loading } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { stackScreenOptions } from '../theme/navigation';
import { palette } from '../theme/tokens';

function RootNavigator() {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 16, backgroundColor: palette.bgApp }}>
        <EmptyState
          icon="database"
          title="Supabase ayarlanmamış"
          description="src/lib/config.ts veya .env içine Supabase URL ve anahtarını girip uygulamayı yeniden başlatın."
        />
      </View>
    );
  }
  if (loading) return <Loading />;

  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="worker/new" options={{ title: 'Yeni işçi', presentation: 'modal' }} />
        <Stack.Screen name="worker/[id]" options={{ title: 'İşçi' }} />
        <Stack.Screen name="worker/edit/[id]" options={{ title: 'İşçiyi düzenle', presentation: 'modal' }} />
        <Stack.Screen name="payment/new" options={{ title: 'Avans / ödeme', presentation: 'modal' }} />
        <Stack.Screen name="income/new" options={{ title: 'Gelir ekle', presentation: 'modal' }} />
        <Stack.Screen name="expense/new" options={{ title: 'Gider ekle', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  // Font yüklenemezse sistem fontuyla devam et
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: palette.bgApp }} />;

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
