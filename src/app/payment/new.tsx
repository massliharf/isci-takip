import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useToast } from '../../components/Toast';
import {
  Avatar,
  Button,
  ChoiceChips,
  Card,
  DateField,
  ErrorText,
  Field,
  FormStack,
  ListCard,
  ListRow,
  Loading,
  moneyTone,
  QuickChips,
  Screen,
  SearchField,
  Section,
  Segmented,
  Text,
} from '../../components/ui';
import { createPayment, listWorkerBalances, listWorkers } from '../../lib/api';
import { errorMessage } from '../../lib/dialog';
import { formatMoney, parseMoney, toISODate } from '../../lib/format';
import { successFeedback } from '../../lib/haptics';
import { METHOD_LABELS, PAYMENT_LABELS, type PayMethod, type PaymentKind } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';

const ADVANCE_PRESETS = [500, 1000, 2000, 5000];

export default function NewPayment() {
  const params = useLocalSearchParams<{ workerId?: string; kind?: PaymentKind; suggested?: string }>();
  const [workerId, setWorkerId] = useState<string | null>(params.workerId ?? null);
  const [kind, setKind] = useState<PaymentKind>(params.kind ?? 'advance');
  const [amount, setAmount] = useState(params.suggested && Number(params.suggested) > 0 ? params.suggested : '');
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<PayMethod>('nakit');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { data } = useFocusData(async () => {
    const [workers, balances] = await Promise.all([listWorkers(true), listWorkerBalances()]);
    return { workers, balance: new Map(balances.map((b) => [b.worker_id, b.balance])) };
  }, 'payment-form');

  const selected = data?.workers.find((w) => w.id === workerId);
  const balance = (workerId && data?.balance.get(workerId)) || 0;
  const value = parseMoney(amount);
  const after = balance - (value > 0 ? value : 0);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return (data?.workers ?? []).filter((w) => !q || w.full_name.toLocaleLowerCase('tr').includes(q));
  }, [data, query]);

  async function save() {
    if (!workerId) return setError('İşçi seçin');
    if (!(value > 0)) return setError('Geçerli bir tutar girin');
    setBusy(true);
    try {
      await createPayment({ worker_id: workerId, pay_date: date, amount: value, kind, note: note.trim() || null, method });
      successFeedback();
      toast(`${PAYMENT_LABELS[kind]} kaydedildi: ${formatMoney(value)}`);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const chips = [
    ...(balance > 0 ? [{ label: `Tüm alacak ${formatMoney(balance)}`, value: String(balance) }] : []),
    ...ADVANCE_PRESETS.map((n) => ({ label: formatMoney(n), value: String(n) })),
  ];

  return (
    <Screen>
      {!data ? (
        <Loading />
      ) : !workerId || !selected ? (
        <Section label="Kime?">
          {data.workers.length > 6 && <SearchField value={query} onChangeText={setQuery} placeholder="İşçi ara" />}
          <ListCard>
            {filtered.map((w) => {
              const b = data.balance.get(w.id) ?? 0;
              return (
                <ListRow
                  key={w.id}
                  leading={<Avatar name={w.full_name} />}
                  title={w.full_name}
                  subtitle={`${formatMoney(w.daily_wage)} / gün`}
                  value={formatMoney(Math.abs(b))}
                  valueTone={moneyTone(b)}
                  valueSub={b < 0 ? 'fazla ödendi' : 'alacağı'}
                  onPress={() => setWorkerId(w.id)}
                  chevron
                />
              );
            })}
          </ListCard>
        </Section>
      ) : (
        <>
          <Card padded={false}>
            <ListRow
              leading={<Avatar name={selected.full_name} />}
              title={selected.full_name}
              subtitle={balance < 0 ? 'Fazla ödenmiş' : 'Güncel alacağı'}
              value={formatMoney(Math.abs(balance))}
              valueTone={moneyTone(balance)}
              valueSub={params.workerId ? undefined : 'değiştir'}
              onPress={params.workerId ? undefined : () => setWorkerId(null)}
            />
          </Card>
          <Card>
            <FormStack>
              <Segmented options={(['advance', 'payment'] as const).map((k) => ({ value: k, label: PAYMENT_LABELS[k] }))} value={kind} onChange={setKind} />
              <Field label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus={!params.suggested} placeholder="0" />
              <QuickChips options={chips} onSelect={setAmount} />
              {value > 0 && (
                <Text variant="caption" tone={after < 0 ? 'negative' : 'secondary'}>
                  Kayıttan sonra {after < 0 ? `fazla ödenmiş olacak: ${formatMoney(-after)}` : `kalan alacağı: ${formatMoney(after)}`}
                </Text>
              )}
              <ChoiceChips<PayMethod>
                options={[
                  { value: 'nakit', label: METHOD_LABELS.nakit, icon: 'dollar-sign' },
                  { value: 'banka', label: METHOD_LABELS.banka, icon: 'credit-card' },
                ]}
                value={method}
                onChange={setMethod}
              />
              <DateField label="Tarih" value={date} onChange={setDate} />
              <Field label="Not" value={note} onChangeText={setNote} placeholder="İsteğe bağlı (ör. bayram avansı)" />
            </FormStack>
          </Card>
          <ErrorText>{error}</ErrorText>
          <Button title={`${PAYMENT_LABELS[kind]} kaydet`} size="lg" onPress={save} loading={busy} disabled={!(value > 0)} />
        </>
      )}
    </Screen>
  );
}
