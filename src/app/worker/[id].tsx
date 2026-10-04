import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { ExportMenu } from '../../components/ExportMenu';
import { useToast } from '../../components/Toast';
import {
  ActionMenu,
  Avatar,
  Button,
  Card,
  Chip,
  currentYearMonth,
  EmptyState,
  ErrorText,
  Hint,
  IconBox,
  IconButton,
  Kpi,
  KpiRow,
  ListCard,
  ListRow,
  Loading,
  moneyTone,
  MonthStepper,
  Screen,
  Section,
  Segmented,
  Stat,
  Text,
  type YearMonth,
} from '../../components/ui';
import {
  clearAttendance,
  deletePayment,
  FAR_FUTURE,
  FAR_PAST,
  getWorker,
  getWorkerBalance,
  listAttendance,
  listPayments,
  setAttendance,
  updateAttendanceStatus,
} from '../../lib/api';
import { useBusinessName } from '../../lib/auth';
import { monthlyHistory, openingBalances, summarizeWorker } from '../../lib/calc';
import { safeFileName } from '../../lib/csv';
import { confirmAction, errorMessage } from '../../lib/dialog';
import { monthLabel, workerHistoryCsv, workerHistoryHtml, workerLedgerCsv, workerStatementHtml } from '../../lib/documents';
import { exportCsv, exportPdf } from '../../lib/export';
import { formatDate, formatDateLong, formatMoney, formatNumber, fromISODate, monthRange, toISODate } from '../../lib/format';
import { tapFeedback } from '../../lib/haptics';
import { PAYMENT_LABELS, STATUS_LABELS, type AttendanceStatus, type Payment } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';
import { categoryTone, palette, radius, space, statusTone } from '../../theme/tokens';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
type View_ = 'month' | 'history';

/** "0532 111 22 33" → "905321112233" (WhatsApp için ülke kodlu) */
function waNumber(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('90')) return d;
  if (d.startsWith('0')) return `9${d}`;
  return d.length === 10 ? `90${d}` : d;
}

export default function WorkerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [view, setView] = useState<View_>('month');
  const [ym, setYm] = useState<YearMonth>(currentYearMonth());
  const [dayMenu, setDayMenu] = useState<string | null>(null);
  const business = useBusinessName();
  const toast = useToast();
  const { start, end } = monthRange(ym.year, ym.month);

  // Ay görünümü: ay başından bugüne kadarki hareketler hem ayı hem devreden bakiyeyi verir
  const month = useFocusData(async () => {
    const [worker, attendanceSince, paymentsSince, total] = await Promise.all([
      getWorker(id),
      listAttendance(start, FAR_FUTURE, id),
      listPayments(start, FAR_FUTURE, id),
      getWorkerBalance(id),
    ]);
    const attendance = attendanceSince.filter((a) => a.work_date <= end);
    const payments = paymentsSince.filter((p) => p.pay_date <= end);
    const opening = openingBalances(total ? [total] : [], attendanceSince, paymentsSince).get(id) ?? 0;
    return { worker, attendance, payments, total, summary: summarizeWorker(worker, attendance, payments, opening) };
  }, `${id}:${start}`);

  // Geçmiş görünümü yalnızca açıldığında yüklenir
  const history = useFocusData(async () => {
    if (view !== 'history') return null;
    const [attendance, payments] = await Promise.all([listAttendance(FAR_PAST, FAR_FUTURE, id), listPayments(FAR_PAST, FAR_FUTURE, id)]);
    return { attendance, payments, rows: monthlyHistory(attendance, payments) };
  }, `${id}:${view}`);

  const data = month.data;
  if (!data) return <Screen>{month.error ? <ErrorText>{month.error}</ErrorText> : <Loading />}</Screen>;
  const { worker, summary, attendance, payments, total } = data;
  const balance = total?.balance ?? 0;
  const daysInMonth = fromISODate(end).getDate();
  const leadingBlanks = (fromISODate(start).getDay() + 6) % 7; // pazartesi başlangıçlı takvim
  const today = toISODate(new Date());
  const byDay = new Map(attendance.map((a) => [a.work_date, a]));
  const fileBase = (suffix: string) => safeFileName(`${worker.full_name} ${suffix}`);

  function reloadAll() {
    month.reload();
    if (view === 'history') history.reload();
  }

  async function setDay(iso: string, status: AttendanceStatus | null) {
    const existing = byDay.get(iso);
    try {
      if (status === null) await clearAttendance(id, iso);
      else if (existing) await updateAttendanceStatus(existing.id, status);
      else await setAttendance(worker, iso, status);
      toast(status === null ? 'Kayıt silindi' : `${formatDate(iso)}: ${STATUS_LABELS[status]}`);
      reloadAll();
    } catch (e) {
      toast(`Kaydedilemedi: ${errorMessage(e)}`, 'error');
    }
  }

  function confirmDeletePayment(p: Payment) {
    confirmAction({
      title: 'Kaydı sil',
      message: `${formatDate(p.pay_date)} tarihli ${formatMoney(p.amount)} ${PAYMENT_LABELS[p.kind].toLocaleLowerCase('tr')} silinsin mi?`,
      confirmText: 'Sil',
      onConfirm: async () => {
        try {
          await deletePayment(p.id);
          toast('Kayıt silindi');
          reloadAll();
        } catch (e) {
          toast(`Silinemedi: ${errorMessage(e)}`, 'error');
        }
      },
    });
  }

  const statusCounts = (Object.keys(statusTone) as AttendanceStatus[]).map((s) => ({
    s,
    n: s === 'full' ? summary.fullDays : s === 'half' ? summary.halfDays : s === 'leave' ? summary.leaveDays : summary.absentDays,
  }));

  return (
    <Screen onRefresh={reloadAll} refreshing={month.loading}>
      <Stack.Screen
        options={{
          title: 'İşçi kartı',
          headerRight: () => <IconButton icon="edit-2" variant="ghost" onPress={() => router.push(`/worker/edit/${id}`)} accessibilityLabel="Düzenle" />,
        }}
      />
      <ErrorText>{month.error}</ErrorText>

      {/* Kimlik + bakiye: ekranın en önemli bilgisi */}
      <Card style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={worker.full_name} size={48} muted={!worker.active} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="heading" numberOfLines={1}>
              {worker.full_name}
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Chip label={`${formatMoney(worker.daily_wage)} / gün`} />
              {!worker.active && <Chip label="Pasif" />}
            </View>
          </View>
          {worker.phone ? (
            <View style={{ flexDirection: 'row', gap: space.xs }}>
              <IconButton icon="phone" onPress={() => Linking.openURL(`tel:${worker.phone}`)} accessibilityLabel="Ara" />
              <IconButton icon="message-circle" onPress={() => Linking.openURL(`https://wa.me/${waNumber(worker.phone!)}`)} accessibilityLabel="WhatsApp" />
            </View>
          ) : null}
        </View>
        <Stat
          label={balance < 0 ? 'Fazla ödenen (işçinin borcu)' : 'Toplam alacağı'}
          value={formatMoney(Math.abs(balance))}
          tone={moneyTone(balance)}
          caption={`Hak edilen ${formatMoney(total?.earned ?? 0)} − verilen ${formatMoney(total?.paid ?? 0)}`}
        />
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 1 }}>
            <Button title="Avans ver" icon="arrow-up-right" onPress={() => router.push({ pathname: '/payment/new', params: { workerId: id, kind: 'advance' } })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Hesap kapat"
              icon="check-circle"
              variant="secondary"
              disabled={balance <= 0}
              onPress={() => router.push({ pathname: '/payment/new', params: { workerId: id, kind: 'payment', suggested: String(Math.max(balance, 0)) } })}
            />
          </View>
        </View>
      </Card>

      <Segmented<View_>
        options={[
          { value: 'month', label: 'Aylık' },
          { value: 'history', label: 'Tüm geçmiş' },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'month' ? (
        <>
          <MonthStepper value={ym} onChange={setYm} />
          {month.loading && <Loading />}
          <KpiRow>
            <Kpi label="Devreden" value={formatMoney(summary.opening)} hint="Önceki aylardan" />
            <Kpi label="Hak edilen" value={formatMoney(summary.earned)} hint={`${formatNumber(summary.workedDays)} gün`} />
          </KpiRow>
          <KpiRow>
            <Kpi label="Verilen" value={formatMoney(summary.paid)} hint={`Avans ${formatMoney(summary.advances)}`} />
            <Kpi label="Ay sonu bakiye" value={formatMoney(summary.closing)} tone={moneyTone(summary.closing)} hint={summary.closing < 0 ? 'fazla ödendi' : 'alacağı'} />
          </KpiRow>

          <Section label="Puantaj">
            <Card style={{ gap: space.md }}>
              <View style={styles.calendar}>
                {WEEKDAYS.map((d) => (
                  <View key={d} style={styles.calendarHead}>
                    <Text variant="caption" tone="tertiary">
                      {d}
                    </Text>
                  </View>
                ))}
                {Array.from({ length: leadingBlanks }, (_, i) => (
                  <View key={`b${i}`} style={styles.calendarCell} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const iso = toISODate(new Date(ym.year, ym.month, i + 1));
                  const a = byDay.get(iso);
                  const tone = a ? statusTone[a.status] : null;
                  const future = iso > today;
                  return (
                    <View key={iso} style={styles.calendarCell}>
                      <Pressable
                        disabled={future}
                        onPress={() => {
                          tapFeedback();
                          setDayMenu(iso);
                        }}
                        accessibilityLabel={`${formatDate(iso)} ${a ? STATUS_LABELS[a.status] : 'kayıt yok'}`}
                        style={({ pressed }) => [
                          styles.calendarDay,
                          { backgroundColor: tone ? tone.soft : palette.control, opacity: future ? 0.35 : pressed ? 0.7 : 1 },
                          iso === today && { borderWidth: 1.5, borderColor: palette.textPrimary },
                        ]}
                      >
                        <Text variant="caption" weight={tone ? 'semibold' : 'regular'} color={tone ? tone.ink : palette.textTertiary}>
                          {i + 1}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {statusCounts.map(({ s, n }) => (
                  <Chip key={s} label={`${STATUS_LABELS[s]} · ${n}`} tone={statusTone[s]} />
                ))}
              </View>
            </Card>
            <Hint>Bir güne dokunarak durumunu değiştirebilirsin.</Hint>
          </Section>

          <Section label="Avans ve ödemeler">
            {payments.length === 0 ? (
              <Card>
                <Text variant="caption" tone="tertiary" align="center">
                  Bu ay kayıt yok
                </Text>
              </Card>
            ) : (
              <ListCard>
                {payments.map((p) => (
                  <ListRow
                    key={p.id}
                    leading={<IconBox icon={p.kind === 'advance' ? 'arrow-up-right' : 'check-circle'} {...categoryTone.payment} />}
                    title={PAYMENT_LABELS[p.kind]}
                    subtitle={`${formatDate(p.pay_date)}${p.note ? ` · ${p.note}` : ''}`}
                    value={formatMoney(p.amount)}
                    onLongPress={() => confirmDeletePayment(p)}
                  />
                ))}
              </ListCard>
            )}
            {payments.length > 0 && <Hint>Silmek için kayda basılı tut.</Hint>}
          </Section>

          <ExportMenu
            label="Ay ekstresini paylaş"
            title={`${monthLabel(ym.year, ym.month)} ekstresi`}
            options={[
              {
                label: 'PDF ekstre',
                subtitle: 'İşçiye gönder: gün gün puantaj, ödemeler, kalan alacak',
                icon: 'file-text',
                kind: 'pdf',
                run: () =>
                  exportPdf(fileBase(monthLabel(ym.year, ym.month)), workerStatementHtml(business, worker, ym.year, ym.month, summary, attendance, payments)),
              },
              {
                label: 'Excel',
                subtitle: 'Bu ayın tüm hareketleri',
                icon: 'grid',
                kind: 'excel',
                run: () => exportCsv(fileBase(monthLabel(ym.year, ym.month)), workerLedgerCsv(worker.full_name, attendance, payments)),
              },
            ]}
          />
        </>
      ) : !history.data ? (
        history.error ? <ErrorText>{history.error}</ErrorText> : <Loading />
      ) : history.data.rows.length === 0 ? (
        <EmptyState icon="calendar" title="Henüz hareket yok" description="Puantaj veya ödeme girildikçe ay ay burada birikir." />
      ) : (
        <>
          <KpiRow>
            <Kpi label="Çalıştığı ay" value={String(history.data.rows.length)} hint={`İlk: ${monthLabel(history.data.rows[0].year, history.data.rows[0].month)}`} />
            <Kpi label="Toplam gün" value={formatNumber(history.data.rows.reduce((t, r) => t + r.workedDays, 0))} />
          </KpiRow>
          <Section label="Ay ay">
            <ListCard>
              {[...history.data.rows].reverse().map((r) => (
                <ListRow
                  key={r.key}
                  title={monthLabel(r.year, r.month)}
                  subtitle={`${formatNumber(r.workedDays)} gün · hak edilen ${formatMoney(r.earned)}`}
                  value={formatMoney(r.cumulative)}
                  valueTone={moneyTone(r.cumulative)}
                  valueSub={`verilen ${formatMoney(r.paid)}`}
                  onPress={() => {
                    setYm({ year: r.year, month: r.month });
                    setView('month');
                  }}
                  chevron
                />
              ))}
            </ListCard>
            <Hint>Bakiye: o ayın sonunda işçinin toplam alacağı. Ayın detayı için dokun.</Hint>
          </Section>
          <ExportMenu
            label="Geçmişi dışa aktar"
            title="Tüm geçmiş"
            options={[
              {
                label: 'PDF özet',
                subtitle: 'Ay ay gün, hak edilen, verilen ve bakiye',
                icon: 'file-text',
                kind: 'pdf',
                run: () => exportPdf(fileBase('gecmis'), workerHistoryHtml(business, worker, history.data!.rows)),
              },
              {
                label: 'Excel — aylık özet',
                subtitle: 'Her ay bir satır',
                icon: 'grid',
                kind: 'excel',
                run: () => exportCsv(fileBase('aylik-ozet'), workerHistoryCsv(worker.full_name, history.data!.rows)),
              },
              {
                label: 'Excel — tüm hareketler',
                subtitle: 'Gün gün puantaj ve her ödeme',
                icon: 'list',
                kind: 'excel',
                run: () => exportCsv(fileBase('tum-hareketler'), workerLedgerCsv(worker.full_name, history.data!.attendance, history.data!.payments)),
              },
            ]}
          />
        </>
      )}

      <ActionMenu
        visible={dayMenu !== null}
        title={dayMenu ? formatDateLong(dayMenu) : ''}
        onClose={() => setDayMenu(null)}
        items={[
          ...(['full', 'half', 'leave', 'absent'] as AttendanceStatus[]).map((s) => ({
            label: STATUS_LABELS[s],
            icon: (s === 'absent' ? 'x' : s === 'leave' ? 'coffee' : 'check') as 'x' | 'coffee' | 'check',
            color: statusTone[s].color,
            soft: statusTone[s].soft,
            selected: dayMenu ? byDay.get(dayMenu)?.status === s : false,
            onPress: () => dayMenu && setDay(dayMenu, s),
          })),
          ...(dayMenu && byDay.has(dayMenu)
            ? [{ label: 'Kaydı sil', icon: 'trash-2' as const, color: palette.negative, soft: palette.negativeSoft, onPress: () => setDay(dayMenu, null) }]
            : []),
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarHead: { width: `${100 / 7}%`, alignItems: 'center', paddingBottom: space.xs },
  calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  calendarDay: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});
