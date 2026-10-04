import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  currentYearMonth,
  Divider,
  ErrorText,
  Hint,
  IconButton,
  Loading,
  moneyTone,
  MonthStepper,
  Row,
  Screen,
  Section,
  Stat,
  Text,
} from '../../components/ui';
import { deletePayment, getWorker, listAttendance, listPayments, listWorkerBalances } from '../../lib/api';
import { summarizeWorker } from '../../lib/calc';
import { formatDate, formatMoney, formatNumber, fromISODate, monthRange, toISODate } from '../../lib/format';
import { PAYMENT_LABELS, STATUS_LABELS, type AttendanceStatus, type Payment } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';
import { categoryTone, palette, radius, space, statusTone } from '../../theme/tokens';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

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
  }, `${id}:${start}`);

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
  const leadingBlanks = (fromISODate(start).getDay() + 6) % 7; // Pazartesi başlangıçlı takvim
  const today = toISODate(new Date());

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: worker.full_name,
          headerRight: () => <IconButton icon="edit-2" variant="ghost" onPress={() => router.push(`/worker/edit/${id}`)} accessibilityLabel="Düzenle" />,
        }}
      />
      <ErrorText>{error}</ErrorText>
      <Card style={{ gap: space.lg }}>
        <Stat
          label={balance < 0 ? 'Fazla ödenen (işçinin borcu)' : 'Toplam alacağı'}
          value={formatMoney(Math.abs(balance))}
          tone={moneyTone(balance)}
          caption={`Hak edilen ${formatMoney(total?.earned ?? 0)} − verilen ${formatMoney(total?.paid ?? 0)}`}
        />
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <Chip label={`${formatMoney(Number(worker.daily_wage))} / gün`} />
          {worker.phone ? <Chip label={worker.phone} /> : null}
          {!worker.active && <Chip label="Pasif" />}
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Avans ver"
              icon="arrow-up-right"
              onPress={() => router.push({ pathname: '/payment/new', params: { workerId: id, kind: 'advance' } })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Ödeme yap"
              icon="check-circle"
              variant="secondary"
              onPress={() => router.push({ pathname: '/payment/new', params: { workerId: id, kind: 'payment', suggested: String(Math.max(balance, 0)) } })}
            />
          </View>
        </View>
      </Card>

      <MonthStepper value={ym} onChange={setYm} />
      {loading && <Loading />}

      <Section label="Puantaj">
        <Card style={{ gap: space.md }}>
          <View style={styles.calendar}>
            {WEEKDAYS.map((d) => (
              <View key={d} style={styles.calendarCell}>
                <Text variant="caption" tone="tertiary">
                  {d}
                </Text>
              </View>
            ))}
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <View key={`b${i}`} style={styles.calendarCell} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const a = attendance.find((x) => fromISODate(x.work_date).getDate() === day);
              const tone = a ? statusTone[a.status] : null;
              const isToday = toISODate(new Date(ym.year, ym.month, day)) === today;
              return (
                <View key={day} style={styles.calendarCell}>
                  <View
                    style={[
                      styles.calendarDay,
                      { backgroundColor: tone ? tone.soft : palette.control },
                      isToday && { borderWidth: 1.5, borderColor: palette.textPrimary },
                    ]}
                  >
                    <Text variant="caption" weight={tone ? 'semibold' : 'regular'} color={tone ? tone.ink : palette.textTertiary}>
                      {day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {(Object.keys(statusTone) as AttendanceStatus[]).map((s) => (
              <Chip key={s} label={STATUS_LABELS[s]} tone={statusTone[s]} />
            ))}
          </View>
        </Card>
      </Section>

      <Section label="Aylık özet">
        <Card style={{ gap: space.xs }}>
          <Row label="Tam gün" value={String(month.fullDays)} />
          <Row label="Yarım gün" value={String(month.halfDays)} />
          <Row label="İzinli" value={String(month.leaveDays)} />
          <Row label="Gelmedi" value={String(month.absentDays)} />
          <Divider />
          <Row label="Çalışılan gün" value={formatNumber(month.workedDays)} strong />
          <Row label="Hak edilen" value={formatMoney(month.earned)} strong />
          <Row label="Avanslar" value={formatMoney(month.advances)} />
          <Row label="Ödemeler" value={formatMoney(month.payments)} />
          <Divider />
          <Row label="Ay farkı" value={formatMoney(month.balance)} tone={moneyTone(month.balance)} strong />
        </Card>
      </Section>

      <Section label="Avans ve ödemeler">
        {payments.length === 0 ? (
          <Card>
            <Text variant="caption" tone="secondary" align="center">
              Bu ay kayıt yok
            </Text>
          </Card>
        ) : (
          <Card padded={false}>
            {payments.map((p, i) => (
              <View key={p.id}>
                {i > 0 && <Divider inset={space.lg} />}
                <Pressable
                  onLongPress={() => confirmDeletePayment(p)}
                  style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: palette.controlActive }]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Chip label={PAYMENT_LABELS[p.kind]} tone={{ soft: categoryTone.payment.soft, ink: categoryTone.payment.color }} />
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {formatDate(p.pay_date)}
                      {p.note ? ` · ${p.note}` : ''}
                    </Text>
                  </View>
                  <Text variant="ui" weight="semibold">
                    {formatMoney(Number(p.amount))}
                  </Text>
                </Pressable>
              </View>
            ))}
          </Card>
        )}
        {payments.length > 0 && <Hint>Silmek için kayda basılı tut.</Hint>}
      </Section>
    </Screen>
  );
}

const styles = {
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2, alignItems: 'center', justifyContent: 'center' },
  calendarDay: { width: '100%', height: '100%', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
} as const;
