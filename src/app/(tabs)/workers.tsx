import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorText,
  Kpi,
  KpiRow,
  ListCard,
  ListRow,
  Loading,
  moneyTone,
  Screen,
  SearchField,
  Section,
  Segmented,
  Stat,
  Text,
} from '../../components/ui';
import { listWorkerBalances, listWorkers } from '../../lib/api';
import { formatMoney, formatNumber } from '../../lib/format';
import { useFocusData } from '../../lib/useAsync';
import { space } from '../../theme/tokens';

type Filter = 'active' | 'debt' | 'all';
type Sort = 'name' | 'balance';

export default function WorkersScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [sort, setSort] = useState<Sort>('balance');
  const { data, error, loading, reload } = useFocusData(async () => {
    const [workers, balances] = await Promise.all([listWorkers(), listWorkerBalances()]);
    const byId = new Map(balances.map((b) => [b.worker_id, b]));
    return workers.map((w) => ({ worker: w, balance: byId.get(w.id) }));
  }, 'workers');

  const owed = data?.reduce((t, x) => t + Math.max(0, x.balance?.balance ?? 0), 0) ?? 0;
  const overpaid = data?.reduce((t, x) => t + Math.min(0, x.balance?.balance ?? 0), 0) ?? 0;
  const activeCount = data?.filter((x) => x.worker.active).length ?? 0;

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return (data ?? [])
      .filter((x) => (filter === 'active' ? x.worker.active : filter === 'debt' ? (x.balance?.balance ?? 0) !== 0 : true))
      .filter((x) => !q || x.worker.full_name.toLocaleLowerCase('tr').includes(q))
      .sort((a, b) =>
        sort === 'balance' ? (b.balance?.balance ?? 0) - (a.balance?.balance ?? 0) : a.worker.full_name.localeCompare(b.worker.full_name, 'tr'),
      );
  }, [data, query, filter, sort]);

  if (loading && !data) return <Loading />;

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <ErrorText>{error}</ErrorText>
      {data?.length === 0 ? (
        <EmptyState
          icon="users"
          title="Henüz işçi yok"
          description="İşçilerini ve günlük yevmiyelerini ekleyerek başla."
          action={<Button title="İşçi ekle" icon="plus" onPress={() => router.push('/worker/new')} />}
        />
      ) : (
        data && (
          <>
            <Card>
              <Stat label="İşçilere ödenecek" value={formatMoney(owed)} caption="Hak edilen yevmiyeler − verilen avans ve ödemeler" />
            </Card>
            <KpiRow>
              <Kpi label="Aktif işçi" value={String(activeCount)} hint={`${data.length - activeCount} pasif`} />
              <Kpi label="Fazla ödenen" value={formatMoney(Math.abs(overpaid))} tone={overpaid < 0 ? 'negative' : 'primary'} hint="İşçilerin borcu" />
            </KpiRow>

            <Section
              label={`${visible.length} işçi`}
              right={
                <Text variant="caption" tone="link" weight="medium" onPress={() => setSort(sort === 'balance' ? 'name' : 'balance')}>
                  {sort === 'balance' ? 'Sırala: bakiye' : 'Sırala: isim'}
                </Text>
              }
            >
              {data.length > 5 && <SearchField value={query} onChangeText={setQuery} placeholder="İşçi ara" />}
              <Segmented<Filter>
                options={[
                  { value: 'active', label: 'Aktif' },
                  { value: 'debt', label: 'Bakiyesi olan' },
                  { value: 'all', label: 'Tümü' },
                ]}
                value={filter}
                onChange={setFilter}
              />
              {visible.length === 0 ? (
                <Card>
                  <Text variant="caption" tone="tertiary" align="center">
                    Eşleşen işçi yok
                  </Text>
                </Card>
              ) : (
                <ListCard>
                  {visible.map(({ worker, balance }) => {
                    const b = balance?.balance ?? 0;
                    return (
                      <ListRow
                        key={worker.id}
                        leading={<Avatar name={worker.full_name} muted={!worker.active} />}
                        title={worker.full_name}
                        subtitle={`${formatMoney(worker.daily_wage)} / gün · ${formatNumber(balance?.worked_days ?? 0)} gün${worker.active ? '' : ' · pasif'}`}
                        value={formatMoney(Math.abs(b))}
                        valueTone={moneyTone(b)}
                        valueSub={b < 0 ? 'fazla ödendi' : b > 0 ? 'alacağı' : 'hesap kapalı'}
                        onPress={() => router.push(`/worker/${worker.id}`)}
                        muted={!worker.active}
                        chevron
                      />
                    );
                  })}
                </ListCard>
              )}
            </Section>
          </>
        )
      )}
      <Text variant="caption" tone="tertiary" align="center" style={{ marginTop: space.sm }}>
        Yeni işçi için sağ üstteki + butonunu kullan.
      </Text>
    </Screen>
  );
}
