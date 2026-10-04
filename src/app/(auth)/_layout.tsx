import { Stack } from 'expo-router';
import { stackScreenOptions } from '../../theme/navigation';

export default function AuthLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Üye ol' }} />
    </Stack>
  );
}
