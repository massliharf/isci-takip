import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';
import { colors } from '../../components/ui';

const icon = (glyph: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>;
  };

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerStyle: { backgroundColor: colors.card } }}>
      <Tabs.Screen name="index" options={{ title: 'Puantaj', tabBarIcon: icon('📋') }} />
      <Tabs.Screen name="workers" options={{ title: 'İşçiler', tabBarIcon: icon('👷') }} />
      <Tabs.Screen name="finance" options={{ title: 'Kasa', tabBarIcon: icon('💰') }} />
      <Tabs.Screen name="report" options={{ title: 'Rapor', tabBarIcon: icon('📊') }} />
      <Tabs.Screen name="settings" options={{ title: 'Hesap', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
