import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Button, Card, DateField, Divider, ErrorText, Field, FormStack, Loading, Screen, Section, Segmented, Text } from '../../components/ui';
import { createPayment, listWorkers } from '../../lib/api';
import { formatMoney, parseMoney, toISODate } from '../../lib/format';
import { PAYMENT_LABELS, type PaymentKind } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';
import { palette, space } from '../../theme/tokens';

export default function NewPayment() {
  const params = useLocalSearchParams<{ workerId?: string; kind?: PaymentKind; suggested?: string }>();
  const [workerId, setWorkerId] = useState<string | null>(params.workerId ?? null);
  const [kind, setKind] = useState<PaymentKind>(params.kind ?? 'advance');
  const [amount, setAmount] = useState(params.suggested && Number(params.suggested) > 0 ? params.suggested : '');
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: workers } = useFocusData(() => listWorkers(true), 'active-workers');

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
      {params.workerId ? (
        selected && (
          <Text variant="heading">
            {selected.full_name}
          </Text>
        )
      ) : (
        <Section label="İşçi">
          {!workers ? (
            <Loading />
          ) : (
            <Card padded={false}>
              {workers.map((w, i) => (
                <View key={w.id}>
                  {i > 0 && <Divider inset={space.lg} />}
                  <Pressable
                    onPress={() => setWorkerId(w.id)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: space.lg,
                      gap: space.md,
                      backgroundColor: pressed ? palette.controlActive : 'transparent',
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="title">{w.full_name}</Text>
                      <Text variant="caption" tone="secondary">
                        {formatMoney(Number(w.daily_wage))} / gün
                      </Text>
                    </View>
                    <Feather name={w.id === workerId ? 'check-circle' : 'circle'} size={20} color={w.id === workerId ? palette.textPrimary : palette.borderStrong} />
                  </Pressable>
                </View>
              ))}
            </Card>
          )}
        </Section>
      )}
      <Card>
        <FormStack>
          <Segmented options={(['advance', 'payment'] as const).map((k) => ({ value: k, label: PAYMENT_LABELS[k] }))} value={kind} onChange={setKind} />
          <Text variant="caption" tone="secondary">
            {kind === 'advance' ? 'Ay içinde verilen avans' : 'Hakediş / maaş ödemesi'}
          </Text>
          <Field label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus={!!params.workerId} />
          <DateField label="Tarih" value={date} onChange={setDate} />
          <Field label="Not" value={note} onChangeText={setNote} placeholder="İsteğe bağlı" />
        </FormStack>
      </Card>
      <ErrorText>{error}</ErrorText>
      <Button title="Kaydet" size="lg" onPress={save} loading={busy} disabled={!workerId || !amount.trim()} />
    </Screen>
  );
}
