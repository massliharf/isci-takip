import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Geri' }}>
      <Stack.Screen name="login" options={{ title: 'Giriş Yap' }} />
      <Stack.Screen name="register" options={{ title: 'Üye Ol' }} />
    </Stack>
  );
}
