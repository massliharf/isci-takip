import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import * as Clipboard from 'expo-clipboard';
import { ExportMenu } from '../../components/ExportMenu';
import { Appear, PressableScale } from '../../components/motion';
import { OvertimeSheet } from '../../components/OvertimeSheet';
import { formatIban, roleTone } from '../../components/WorkerForm';
import { useToast } from '../../components/Toast';
import {
  ActionMenu,
  Avatar,
  Card,
  Chip,
  Divider,
  HeroCard,
  HeroStats,
  Row,
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
  updateAttendance,
  updateAttendanceStatus,
} from '../../lib/api';
import { useBusinessName } from '../../lib/auth';
import { monthlyHistory, openingBalances, overtimeRateFor, summarizeWorker } from '../../lib/calc';
import { safeFileName } from '../../lib/csv';
import { confirmAction, errorMessage } from '../../lib/dialog';
import { monthLabel, workerHistoryCsv, workerHistoryHtml, workerLedgerCsv, workerStatementHtml } from '../../lib/documents';
import { exportCsv, exportPdf } from '../../lib/export';
import { formatDate, formatDateLong, formatMoney, formatNumber, fromISODate, monthRange, toISODate } from '../../lib/format';
import { tapFeedback } from '../../lib/haptics';
import { PAYMENT_LABELS, ROLE_LABELS, STATUS_LABELS, type Attendance, type AttendanceStatus, type Payment } from '../../lib/types';
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
  const [overtimeDay, setOvertimeDay] = useState<Attendance | null>(null);
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

      {/* Bakiye: ekranın en önemli bilgisi */}
      <Appear>
        <HeroCard
          label={balance < 0 ? 'Fazla ödenen (işçinin borcu)' : 'Toplam alacağı'}
          amount={Math.abs(balance)}
          caption={`${worker.full_name} · ${ROLE_LABELS[worker.role] ?? 'İşçi'}`}
          right={<Avatar name={worker.full_name} size={44} muted={!worker.active} />}
        >
          <HeroStats
            items={[
              { label: 'Hak edilen', value: formatMoney(total?.earned ?? 0) },
              { label: 'Verilen', value: formatMoney(total?.paid ?? 0) },
              { label: 'Çalıştığı gün', value: formatNumber(total?.worked_days ?? 0) },
            ]}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <PressableScale
              onPress={() => router.push({ pathname: '/payment/new', params: { workerId: id, kind: 'advance' } })}
              style={[heroBtn, { flex: 1, backgroundColor: palette.heroText }]}
            >
              <Feather name="arrow-up-right" size={16} color={palette.textPrimary} />
              <Text variant="ui" weight="semibold">
                Avans ver
              </Text>
            </PressableScale>
            <PressableScale
              disabled={balance <= 0}
              onPress={() => router.push({ pathname: '/payment/new', params: { workerId: id, kind: 'payment', suggested: String(Math.max(balance, 0)) } })}
              style={[heroBtn, { flex: 1, backgroundColor: palette.heroLine, opacity: balance <= 0 ? 0.5 : 1 }]}
            >
              <Feather name="check-circle" size={16} color={palette.heroText} />
              <Text variant="ui" weight="semibold" color={palette.heroText}>
                Hesap kapat
              </Text>
            </PressableScale>
          </View>
        </HeroCard>
      </Appear>

      {/* Profil */}
      <Appear index={1}>
        <Card padded={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text variant="heading" numberOfLines={1}>
                {worker.full_name}
              </Text>
              <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
                <Chip label={ROLE_LABELS[worker.role] ?? 'İşçi'} tone={roleTone(worker.role ?? 'diger')} />
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
          <Divider inset={space.lg} />
          <View style={{ paddingHorizontal: space.lg, paddingVertical: space.sm }}>
            <Row label="İşe başlama" value={`${formatDate(worker.start_date)} · ${tenure(worker.start_date)}`} />
            <Row label="Mesai ücreti" value={`${formatMoney(overtimeRateFor(worker))} / saat`} hint={worker.overtime_rate ? undefined : 'Yevmiye / 8 × 1,5'} />
            {worker.phone ? <Row label="Telefon" value={worker.phone} /> : null}
            {worker.emergency_contact ? <Row label="Acil durumda" value={worker.emergency_contact} /> : null}
          </View>
          {worker.iban ? (
            <>
              <Divider inset={space.lg} />
              <ListRow
                leading={<IconBox icon="credit-card" {...categoryTone.payment} />}
                title={formatIban(worker.iban)}
                subtitle="IBAN · kopyalamak için dokun"
                onPress={async () => {
                  await Clipboard.setStringAsync(worker.iban!);
                  toast('IBAN kopyalandı');
                }}
              />
            </>
          ) : null}
          {worker.notes ? (
            <>
              <Divider inset={space.lg} />
              <Text variant="caption" tone="secondary" style={{ padding: space.lg }}>
                {worker.notes}
              </Text>
            </>
          ) : null}
        </Card>
      </Appear>

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
            <Kpi icon="corner-down-right" accent={categoryTone.worker} label="Devreden" value={formatMoney(summary.opening)} hint="Önceki aylardan" />
            <Kpi icon="calendar" accent={categoryTone.income} label="Hak edilen" value={formatMoney(summary.earned)} hint={`${formatNumber(summary.workedDays)} gün`} />
          </KpiRow>
          <KpiRow>
            <Kpi icon="clock" accent={OT_TONE} label="Mesai" value={`${formatNumber(summary.overtimeHours)} saat`} hint={formatMoney(summary.overtimeEarned)} />
            <Kpi icon="arrow-up-right" accent={categoryTone.payment} label="Verilen" value={formatMoney(summary.paid)} hint={`Avans ${formatMoney(summary.advances)}`} />
          </KpiRow>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1 }}>
              <Text variant="overline" tone="secondary">
                Ay sonu bakiye
              </Text>
              <Text variant="caption" tone="tertiary">
                Devreden + hak edilen − verilen
              </Text>
            </View>
            <Text variant="display" tone={moneyTone(summary.closing)} numeric>
              {formatMoney(summary.closing)}
            </Text>
          </Card>

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
                        {a && a.overtime_hours > 0 ? <View style={styles.otDot} /> : null}
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
                    onPress={() => router.push({ pathname: '/payment/new', params: { id: p.id } })}
                    onLongPress={() => confirmDeletePayment(p)}
                    chevron
                  />
                ))}
              </ListCard>
            )}
            {payments.length > 0 && <Hint>Düzenlemek için dokun, hızlı silmek için basılı tut.</Hint>}
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
            ? [
                {
                  label: 'Mesai / not',
                  subtitle: byDay.get(dayMenu)!.overtime_hours > 0 ? `${formatNumber(byDay.get(dayMenu)!.overtime_hours)} saat` : 'Saat ve not ekle',
                  icon: 'clock' as const,
                  ...OT_TONE,
                  onPress: () => setOvertimeDay(byDay.get(dayMenu)!),
                },
              ]
            : []),
          ...(dayMenu && byDay.has(dayMenu)
            ? [{ label: 'Kaydı sil', icon: 'trash-2' as const, color: palette.negative, soft: palette.negativeSoft, onPress: () => setDay(dayMenu, null) }]
            : []),
        ]}
      />
      <OvertimeSheet
        record={overtimeDay}
        workerName={worker.full_name}
        onClose={() => setOvertimeDay(null)}
        onSave={async (hours, note) => {
          if (!overtimeDay) return;
          try {
            await updateAttendance(overtimeDay.id, { overtime_hours: hours, note });
            toast('Mesai kaydedildi');
            setOvertimeDay(null);
            reloadAll();
          } catch (e) {
            toast(`Kaydedilemedi: ${errorMessage(e)}`, 'error');
          }
        }}
      />
    </Screen>
  );
}

const OT_TONE = { color: '#C25A12', soft: 'rgba(255,138,61,0.14)' };
const heroBtn = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 44, borderRadius: radius.sm } as const;

/** "2024-03-01" → "2 yıl 7 ay" */
function tenure(startIso: string): string {
  const s = fromISODate(startIso);
  const n = new Date();
  let months = (n.getFullYear() - s.getFullYear()) * 12 + (n.getMonth() - s.getMonth());
  if (n.getDate() < s.getDate()) months--;
  if (months < 1) return 'yeni';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yıl` : '', m ? `${m} ay` : ''].filter(Boolean).join(' ');
}

const styles = StyleSheet.create({
  calendar: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarHead: { width: `${100 / 7}%`, alignItems: 'center', paddingBottom: space.xs },
  calendarCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  calendarDay: { flex: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  otDot: { position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF8A3D' },
});
