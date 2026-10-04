import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Button, Card, colors, currentYearMonth, ErrorText, H1, Loading, MonthStepper, Muted, Row, Screen } from '../../components/ui';
import { deleteExpense, deleteIncome, deletePayment, listExpenses, listIncomes, listPayments, listWorkers } from '../../lib/api';
import { formatDate, formatMoney, monthRange } from '../../lib/format';
import { PAYMENT_LABELS } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';

export default function FinanceScreen() {
  const [ym, setYm] = useState(currentYearMonth());
  const { start, end } = monthRange(ym.year, ym.month);
  const { data, error, loading, reload } = useFocusData(async () => {
    const [incomes, expenses, payments, workers] = await Promise.all([
      listIncomes(start, end),
      listExpenses(start, end),
      listPayments(start, end),
      listWorkers(),
    ]);
    return { incomes, expenses, payments, workers };
  }, [start]);

  function confirmDelete(label: string, action: () => Promise<void>) {
    Alert.alert('Kaydı sil', `${label} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await action().catch((e) => Alert.alert('Silinemedi', String(e)));
          reload();
        },
      },
    ]);
  }

  const sum = (xs: { amount: number }[]) => xs.reduce((t, x) => t + Number(x.amount), 0);
  const workerName = (id: string) => data?.workers.find((w) => w.id === id)?.full_name ?? '?';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button small title="+ Gelir" onPress={() => router.push('/income/new')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button small title="+ Gider" variant="secondary" onPress={() => router.push('/expense/new')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button small title="+ Avans" variant="secondary" onPress={() => router.push('/payment/new')} />
        </View>
      </View>
      <MonthStepper value={ym} onChange={setYm} />
      <ErrorText>{error}</ErrorText>
      {loading && !data && <Loading />}
      {data && (
        <>
          <Card>
            <H1>Gelirler · {formatMoney(sum(data.incomes))}</H1>
            {data.incomes.length === 0 && <Muted>Kayıt yok</Muted>}
            {data.incomes.map((i) => (
              <Pressable key={i.id} onLongPress={() => confirmDelete(formatMoney(Number(i.amount)), () => deleteIncome(i.id))}>
                <Row label={`${formatDate(i.income_date)}${i.description ? ` · ${i.description}` : ''}`} value={formatMoney(Number(i.amount))} color={colors.green} />
              </Pressable>
            ))}
          </Card>
          <Card>
            <H1>İşçilere verilen · {formatMoney(sum(data.payments))}</H1>
            {data.payments.length === 0 && <Muted>Kayıt yok</Muted>}
            {data.payments.map((p) => (
              <Pressable key={p.id} onLongPress={() => confirmDelete(formatMoney(Number(p.amount)), () => deletePayment(p.id))}>
                <Row label={`${formatDate(p.pay_date)} · ${workerName(p.worker_id)} · ${PAYMENT_LABELS[p.kind]}`} value={formatMoney(Number(p.amount))} />
              </Pressable>
            ))}
          </Card>
          <Card>
            <H1>Diğer giderler · {formatMoney(sum(data.expenses))}</H1>
            {data.expenses.length === 0 && <Muted>Kayıt yok</Muted>}
            {data.expenses.map((e) => (
              <Pressable key={e.id} onLongPress={() => confirmDelete(formatMoney(Number(e.amount)), () => deleteExpense(e.id))}>
                <Row label={`${formatDate(e.expense_date)}${e.description ? ` · ${e.description}` : ''}`} value={formatMoney(Number(e.amount))} color={colors.red} />
              </Pressable>
            ))}
          </Card>
          <Muted>Bir kaydı silmek için üzerine basılı tutun.</Muted>
        </>
      )}
    </Screen>
  );
}
