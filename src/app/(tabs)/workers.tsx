import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Button, Card, Chip, Divider, EmptyState, ErrorText, Loading, moneyTone, Screen, Section, Stat, Text } from '../../components/ui';
import { listWorkerBalances, listWorkers } from '../../lib/api';
import { formatMoney, formatNumber } from '../../lib/format';
import { useFocusData } from '../../lib/useAsync';
import { palette, space } from '../../theme/tokens';

export default function WorkersScreen() {
  const { data, error, loading } = useFocusData(async () => {
    const [workers, balances] = await Promise.all([listWorkers(), listWorkerBalances()]);
    return workers.map((w) => ({ worker: w, balance: balances.find((b) => b.worker_id === w.id) }));
  }, 'workers');

  const totalOwed = data?.reduce((t, x) => t + (x.balance?.balance ?? 0), 0) ?? 0;

  return (
    <Screen>
      <ErrorText>{error}</ErrorText>
      {loading && !data && <Loading />}
      {data?.length === 0 && (
        <EmptyState
          icon="users"
          title="Henüz işçi yok"
          description="İşçilerini ve günlük yevmiyelerini ekleyerek başla."
          action={<Button title="İşçi ekle" icon="plus" onPress={() => router.push('/worker/new')} />}
        />
      )}
      {data && data.length > 0 && (
        <>
          <Card>
            <Stat label="İşçilere kalan borç" value={formatMoney(totalOwed)} tone={totalOwed < 0 ? 'negative' : 'primary'} caption="Hak edilen yevmiye − verilen avans ve ödemeler" />
          </Card>
          <Section label={`${data.length} işçi`}>
            <Card padded={false}>
              {data.map(({ worker, balance }, i) => {
                const b = balance?.balance ?? 0;
                return (
                  <View key={worker.id}>
                    {i > 0 && <Divider inset={space.lg} />}
                    <Pressable
                      onPress={() => router.push(`/worker/${worker.id}`)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.md,
                        padding: space.lg,
                        backgroundColor: pressed ? palette.controlActive : 'transparent',
                        opacity: worker.active ? 1 : 0.6,
                      })}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                          <Text variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {worker.full_name}
                          </Text>
                          {!worker.active && <Chip label="Pasif" />}
                        </View>
                        <Text variant="caption" tone="secondary">
                          {formatMoney(Number(worker.daily_wage))} / gün · {formatNumber(balance?.worked_days ?? 0)} gün
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="ui" weight="semibold" tone={moneyTone(b)}>
                          {formatMoney(Math.abs(b))}
                        </Text>
                        <Text variant="caption" tone="tertiary">
                          {b < 0 ? 'fazla ödendi' : 'alacağı'}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={palette.textTertiary} />
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          </Section>
        </>
      )}
    </Screen>
  );
}
