import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button, Card, colors, currentYearMonth, ErrorText, H1, Loading, MonthStepper, Muted, Row, Screen } from '../../components/ui';
import { deletePayment, getWorker, listAttendance, listPayments, listWorkerBalances } from '../../lib/api';
import { summarizeWorker } from '../../lib/calc';
import { formatDate, formatMoney, fromISODate, monthRange } from '../../lib/format';
import { PAYMENT_LABELS, type AttendanceStatus, type Payment } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  full: colors.green,
  half: colors.blue,
  leave: colors.amber,
  absent: colors.red,
};

export default function WorkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [ym, setYm] = useState(currentYearMonth());
  const { start, end } = monthRange(ym.year, ym.month);

  const { data, error, loading, reload } = useFocusData(async () => {
    const [worker, attendance, payments, balances] = await Promise.all([
      getWorker(id),
      listAttendance(start, end, id),
      listPayments(start, end, id),
      listWorkerBalances(),
    ]);
    return {
      worker,
      attendance,
      payments,
      month: summarizeWorker(worker, attendance, payments),
      total: balances.find((b) => b.worker_id === id),
    };
  }, [id, start]);

  function confirmDeletePayment(p: Payment) {
    Alert.alert('Kaydı sil', `${formatDate(p.pay_date)} tarihli ${formatMoney(Number(p.amount))} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await deletePayment(p.id).catch((e) => Alert.alert('Silinemedi', String(e)));
          reload();
        },
      },
    ]);
  }

  if (!data) return <Screen>{error ? <ErrorText>{error}</ErrorText> : <Loading />}</Screen>;
  const { worker, month, total, attendance, payments } = data;
  const balance = total?.balance ?? 0;
  const daysInMonth = fromISODate(end).getDate();

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: worker.full_name,
          headerRight: () => (
            <Text style={{ color: colors.blue, fontSize: 16 }} onPress={() => router.push(`/worker/edit/${id}`)}>
              Düzenle
            </Text>
          ),
        }}
      />
      <ErrorText>{error}</ErrorText>
      <Card>
        <Muted>{balance >= 0 ? 'Toplam alacağı (tüm zamanlar)' : 'Fazla ödenen (işçinin borcu)'}</Muted>
        <Text style={{ fontSize: 26, fontWeight: '800', color: balance >= 0 ? colors.green : colors.red }}>{formatMoney(Math.abs(balance))}</Text>
        <Muted>
          Hak edilen {formatMoney(total?.earned ?? 0)} − Verilen {formatMoney(total?.paid ?? 0)}
        </Muted>
        <Muted>
          Güncel yevmiye: {formatMoney(Number(worker.daily_wage))}
          {worker.phone ? ` · Tel: ${worker.phone}` : ''}
        </Muted>
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="Avans Ver" onPress={() => router.push({ pathname: '/payment/new', params: { workerId: id, kind: 'advance' } })} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Ödeme Yap" variant="secondary" onPress={() => router.push({ pathname: '/payment/new', params: { workerId: id, kind: 'payment', suggested: String(Math.max(balance, 0)) } })} />
        </View>
      </View>

      <MonthStepper value={ym} onChange={setYm} />
      {loading && <Loading />}
      <Card>
        <H1>Aylık özet</H1>
        <Row label="Tam gün" value={String(month.fullDays)} />
        <Row label="Yarım gün" value={String(month.halfDays)} />
        <Row label="İzinli" value={String(month.leaveDays)} />
        <Row label="Gelmedi" value={String(month.absentDays)} />
        <Row label="Çalışılan gün" value={String(month.workedDays)} bold />
        <Row label="Hak edilen" value={formatMoney(month.earned)} bold />
        <Row label="Avanslar" value={formatMoney(month.advances)} />
        <Row label="Ödemeler" value={formatMoney(month.payments)} />
        <Row label="Ay farkı" value={formatMoney(month.balance)} color={month.balance >= 0 ? colors.green : colors.red} bold />
      </Card>

      <Card>
        <H1>Puantaj</H1>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const a = attendance.find((x) => fromISODate(x.work_date).getDate() === day);
            return (
              <View
                key={day}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: a ? STATUS_COLOR[a.status] : colors.bg,
                }}
              >
                <Text style={{ color: a ? '#fff' : colors.muted, fontWeight: '600' }}>{day}</Text>
              </View>
            );
          })}
        </View>
        <Muted>🟩 Tam  🟦 Yarım  🟨 İzinli  🟥 Gelmedi</Muted>
      </Card>

      <Card>
        <H1>Avans / Ödemeler</H1>
        {payments.length === 0 && <Muted>Bu ay kayıt yok.</Muted>}
        {payments.map((p) => (
          <Pressable key={p.id} onLongPress={() => confirmDeletePayment(p)}>
            <Row label={`${formatDate(p.pay_date)} · ${PAYMENT_LABELS[p.kind]}${p.note ? ` · ${p.note}` : ''}`} value={formatMoney(Number(p.amount))} />
          </Pressable>
        ))}
        {payments.length > 0 && <Muted>Silmek için kayda basılı tutun.</Muted>}
      </Card>
    </Screen>
  );
}
