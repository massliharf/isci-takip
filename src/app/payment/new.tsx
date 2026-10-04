import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Card, DateField, ErrorText, Field, Loading, Muted, Screen, Segmented } from '../../components/ui';
import { createPayment, listWorkers } from '../../lib/api';
import { formatMoney, parseMoney, toISODate } from '../../lib/format';
import { PAYMENT_LABELS, type PaymentKind } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';

export default function NewPayment() {
  const params = useLocalSearchParams<{ workerId?: string; kind?: PaymentKind; suggested?: string }>();
  const [workerId, setWorkerId] = useState<string | null>(params.workerId ?? null);
  const [kind, setKind] = useState<PaymentKind>(params.kind ?? 'advance');
  const [amount, setAmount] = useState(params.suggested && Number(params.suggested) > 0 ? params.suggested : '');
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: workers } = useFocusData(() => listWorkers(true), []);

  async function save() {
    const value = parseMoney(amount);
    if (!workerId) return setError('İşçi seçin');
    if (!(value > 0)) return setError('Geçerli bir tutar girin');
    setBusy(true);
    try {
      await createPayment({ worker_id: workerId, pay_date: date, amount: value, kind, note: note.trim() || null });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const selected = workers?.find((w) => w.id === workerId);

  return (
    <Screen>
      {!params.workerId && (
        <Card>
          <Muted>İşçi</Muted>
          {!workers ? (
            <Loading />
          ) : (
            workers.map((w) => (
              <Button key={w.id} small title={w.full_name} variant={w.id === workerId ? 'primary' : 'secondary'} onPress={() => setWorkerId(w.id)} />
            ))
          )}
        </Card>
      )}
      <Card>
        {selected && <Muted>{selected.full_name} · Yevmiye {formatMoney(Number(selected.daily_wage))}</Muted>}
        <Segmented
          options={(['advance', 'payment'] as const).map((k) => ({ value: k, label: PAYMENT_LABELS[k] }))}
          value={kind}
          onChange={setKind}
        />
        <Muted>{kind === 'advance' ? 'Ay içinde verilen avans' : 'Hakediş / maaş ödemesi'}</Muted>
        <Field label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
        <DateField label="Tarih" value={date} onChange={setDate} />
        <Field label="Not" value={note} onChangeText={setNote} />
        <ErrorText>{error}</ErrorText>
        <Button title="Kaydet" onPress={save} loading={busy} />
      </Card>
    </Screen>
  );
}
