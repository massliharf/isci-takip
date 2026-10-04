import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, colors, ErrorText, Loading, Muted, Screen } from '../../components/ui';
import { listWorkerBalances, listWorkers } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { useFocusData } from '../../lib/useAsync';

export default function WorkersScreen() {
  const { data, error, loading } = useFocusData(async () => {
    const [workers, balances] = await Promise.all([listWorkers(), listWorkerBalances()]);
    return workers.map((w) => ({ worker: w, balance: balances.find((b) => b.worker_id === w.id) }));
  }, []);

  const totalOwed = data?.reduce((t, x) => t + (x.balance?.balance ?? 0), 0) ?? 0;

  return (
    <Screen>
      <Button title="+ Yeni İşçi" onPress={() => router.push('/worker/new')} />
      <ErrorText>{error}</ErrorText>
      {loading && !data && <Loading />}
      {data?.length === 0 && <Muted>Henüz işçi eklenmedi.</Muted>}
      {data && data.length > 0 && (
        <Card>
          <Muted>İşçilere toplam kalan borç (alacak - verilen)</Muted>
          <Text style={{ fontSize: 20, fontWeight: '700', color: totalOwed >= 0 ? colors.text : colors.red }}>{formatMoney(totalOwed)}</Text>
        </Card>
      )}
      {data?.map(({ worker, balance }) => {
        const b = balance?.balance ?? 0;
        return (
          <Pressable key={worker.id} onPress={() => router.push(`/worker/${worker.id}`)}>
            <Card style={{ opacity: worker.active ? 1 : 0.6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>
                  {worker.full_name}
                  {!worker.active && ' (pasif)'}
                </Text>
                <Text style={{ fontWeight: '700', color: b >= 0 ? colors.green : colors.red }}>{formatMoney(b)}</Text>
              </View>
              <Muted>
                Yevmiye {formatMoney(Number(worker.daily_wage))} · {balance?.worked_days ?? 0} gün · {b >= 0 ? 'Alacağı' : 'Fazla ödenen'}
              </Muted>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
