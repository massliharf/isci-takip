import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useState } from 'react';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionMenu, IconButton, type IconName } from '../../components/ui';
import { tabScreenOptions } from '../../theme/navigation';
import { categoryTone } from '../../theme/tokens';

const icon = (name: IconName) =>
  function TabIcon({ color }: { color: ColorValue }) {
    return <Feather name={name} size={22} color={color} />;
  };

/** Tek oluşturma girişi: pembe "+" (referanstaki marka aksiyonu) */
function CreateButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <View style={{ marginRight: 16 }}>
      <IconButton icon="plus" variant="brand" onPress={onPress} accessibilityLabel={label} />
    </View>
  );
}

function FinanceCreateButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CreateButton label="Kayıt ekle" onPress={() => setOpen(true)} />
      <ActionMenu
        visible={open}
        title="Gelir-gider ekle"
        onClose={() => setOpen(false)}
        items={[
          { label: 'Gelir', subtitle: 'Hakediş, müşteri avansı, ek iş', icon: 'arrow-down-left', ...categoryTone.income, onPress: () => router.push('/income/new') },
          { label: 'Gider', subtitle: 'Malzeme, nakliye, yakıt, kira, vergi', icon: 'arrow-up-right', ...categoryTone.expense, onPress: () => router.push('/expense/new') },
          { label: 'Avans / ödeme', subtitle: 'İşçiye verilen para', icon: 'user-check', ...categoryTone.payment, onPress: () => router.push('/payment/new') },
        ]}
      />
    </>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        ...tabScreenOptions,
        // Varsayılan 49 pt'de etiketin alt kısmı kesiliyor; alt güvenli alanı da hesaba katarak büyüt
        tabBarStyle: { ...tabScreenOptions.tabBarStyle, height: 64 + insets.bottom, paddingBottom: insets.bottom + 4, paddingTop: 4 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Puantaj', tabBarIcon: icon('check-square') }} />
      <Tabs.Screen
        name="workers"
        options={{
          title: 'İşçiler',
          tabBarIcon: icon('users'),
          headerRight: () => <CreateButton label="Yeni işçi" onPress={() => router.push('/worker/new')} />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{ title: 'Gelir-Gider', tabBarIcon: icon('trending-up'), headerRight: () => <FinanceCreateButton /> }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Özet',
          tabBarIcon: icon('pie-chart'),
          headerRight: () => (
            <View style={{ marginRight: 16 }}>
              <IconButton icon="user" onPress={() => router.push('/settings')} accessibilityLabel="Hesap" />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
