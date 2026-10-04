import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { colors, Loading } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

function RootNavigator() {
  const { session, loading } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Supabase ayarlanmamış</Text>
        <Text>.env dosyasına EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY değerlerini girip uygulamayı yeniden başlatın.</Text>
      </View>
    );
  }
  if (loading) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerBackTitle: 'Geri',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="worker/new" options={{ title: 'Yeni İşçi', presentation: 'modal' }} />
        <Stack.Screen name="worker/[id]" options={{ title: 'İşçi' }} />
        <Stack.Screen name="worker/edit/[id]" options={{ title: 'İşçiyi Düzenle', presentation: 'modal' }} />
        <Stack.Screen name="payment/new" options={{ title: 'Avans / Ödeme', presentation: 'modal' }} />
        <Stack.Screen name="income/new" options={{ title: 'Gelir Ekle', presentation: 'modal' }} />
        <Stack.Screen name="expense/new" options={{ title: 'Gider Ekle', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}
