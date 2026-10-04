import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { AnimatedBar, Appear, PressableScale } from '../../components/motion';
import { OvertimeSheet } from '../../components/OvertimeSheet';
import { useToast } from '../../components/Toast';
import { ActionMenu, Avatar, Button, Card, Chip, EmptyState, ErrorText, HeroCard, Hint, Loading, Screen, Section, Segmented, Text } from '../../components/ui';
import { roleTone } from '../../components/WorkerForm';
import { weekStart, WeekStrip } from '../../components/WeekStrip';
import { clearAttendance, listAttendance, listWorkers, setAttendance, updateAttendance } from '../../lib/api';
import { attendanceEarning, overtimeRateFor } from '../../lib/calc';
import { errorMessage } from '../../lib/dialog';
import { addDays, formatDateLong, formatMoney, formatNumber, toISODate } from '../../lib/format';
import { successFeedback, tapFeedback } from '../../lib/haptics';
import { ROLE_LABELS, STATUS_LABELS, type Attendance, type AttendanceStatus, type Worker } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';
import { palette, radius, space, statusTone } from '../../theme/tokens';

const OPTIONS: { value: AttendanceStatus; label: string; tone: (typeof statusTone)[AttendanceStatus] }[] = [
  { value: 'full', label: 'Tam', tone: statusTone.full },
  { value: 'half', label: 'Yarım', tone: statusTone.half },
  { value: 'leave', label: 'İzinli', tone: statusTone.leave },
  { value: 'absent', label: 'Yok', tone: statusTone.absent },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Günaydın' : h < 18 ? 'İyi çalışmalar' : 'İyi akşamlar';
};

export default function PuantajScreen() {
  const [date, setDate] = useState(toISODate(new Date()));
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [overtimeFor, setOvertimeFor] = useState<{ record: Attendance; name: string } | null>(null);
  const toast = useToast();
  const week = weekStart(date);

  // Haftanın tüm kayıtları tek seferde gelir; gün değiştirmek yeni istek gerektirmez
  const { data, setData, error, loading, reload } = useFocusData(async () => {
    const [workers, attendance] = await Promise.all([listWorkers(true), listAttendance(week, addDays(week, 6))]);
    return { workers, attendance };
  }, week);

  const workerIds = useMemo(() => new Set(data?.workers.map((w) => w.id)), [data]);
  const marked = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of data?.attendance ?? []) if (workerIds.has(a.worker_id)) m[a.work_date] = (m[a.work_date] ?? 0) + 1;
    return m;
  }, [data, workerIds]);
  const today = useMemo(() => new Map((data?.attendance ?? []).filter((a) => a.work_date === date).map((a) => [a.worker_id, a])), [data, date]);

  const replaceRecord = (workerId: string, rec: Attendance | null) =>
    setData((d) => d && { ...d, attendance: [...d.attendance.filter((a) => !(a.worker_id === workerId && a.work_date === date)), ...(rec ? [rec] : [])] });

  /** Ekranı hemen günceller, sunucu hatasında geri alır */
  async function mark(worker: Worker, status: AttendanceStatus) {
    if (!data) return;
    tapFeedback();
    const before = data.attendance;
    const current = today.get(worker.id);
    const removing = current?.status === status;
    replaceRecord(
      worker.id,
      removing
        ? null
        : {
            id: current?.id ?? `tmp-${worker.id}`,
            worker_id: worker.id,
            work_date: date,
            status,
            daily_wage: current?.daily_wage ?? worker.daily_wage,
            note: current?.note ?? null,
            overtime_hours: current?.overtime_hours ?? 0,
            overtime_rate: current?.overtime_rate ?? overtimeRateFor(worker),
          },
    );
    try {
      if (removing) await clearAttendance(worker.id, date);
      else replaceRecord(worker.id, current ? await updateAttendance(current.id, { status }) : await setAttendance(worker, date, status));
    } catch (e) {
      setData((d) => d && { ...d, attendance: before });
      toast(`Kaydedilemedi: ${errorMessage(e)}`, 'error');
    }
  }

  async function bulk(kind: 'fill-full' | 'all-half' | 'copy-yesterday') {
    if (!data) return;
    setBulkBusy(true);
    try {
      let saved: Attendance[] = [];
      if (kind === 'copy-yesterday') {
        const prev = await listAttendance(addDays(date, -1), addDays(date, -1));
        const byWorker = new Map(prev.map((a) => [a.worker_id, a.status]));
        const targets = data.workers.filter((w) => !today.has(w.id) && byWorker.has(w.id));
        if (targets.length === 0) throw new Error('Dün için kopyalanacak kayıt yok');
        saved = await Promise.all(targets.map((w) => setAttendance(w, date, byWorker.get(w.id)!)));
      } else {
        const status: AttendanceStatus = kind === 'all-half' ? 'half' : 'full';
        const targets = kind === 'fill-full' ? data.workers.filter((w) => !today.has(w.id)) : data.workers;
        saved = await Promise.all(
          targets.map((w) => {
            const cur = today.get(w.id);
            return cur ? updateAttendance(cur.id, { status }) : setAttendance(w, date, status);
          }),
        );
      }
      const ids = new Set(saved.map((a) => a.worker_id));
      setData((d) => d && { ...d, attendance: [...d.attendance.filter((a) => !(a.work_date === date && ids.has(a.worker_id))), ...saved] });
      successFeedback();
      toast(`${saved.length} kişi güncellendi`);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBulkBusy(false);
    }
  }

  async function saveOvertime(hours: number, note: string | null) {
    if (!overtimeFor) return;
    try {
      const saved = await updateAttendance(overtimeFor.record.id, { overtime_hours: hours, note });
      replaceRecord(saved.worker_id, saved);
      successFeedback();
      toast(hours > 0 ? `${formatNumber(hours)} saat mesai kaydedildi` : 'Kaydedildi');
      setOvertimeFor(null);
    } catch (e) {
      toast(`Kaydedilemedi: ${errorMessage(e)}`, 'error');
    }
  }

  const workers = data?.workers ?? [];
  const dayRecords = workers.map((w) => today.get(w.id)).filter((a): a is Attendance => !!a);
  const dayTotal = dayRecords.reduce((t, a) => t + attendanceEarning(a), 0);
  const present = dayRecords.filter((a) => a.status === 'full' || a.status === 'half').length;
  const otHours = dayRecords.reduce((t, a) => t + a.overtime_hours, 0);
  const unmarked = workers.length - dayRecords.length;
  const isToday = date === toISODate(new Date());

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <Appear>
        <WeekStrip value={date} onChange={setDate} marked={marked} total={workers.length} />
      </Appear>
      <ErrorText>{error}</ErrorText>
      {loading && !data ? (
        <Loading />
      ) : data && workers.length === 0 ? (
        <EmptyState
          icon="users"
          title="Ekibini ekle"
          description="Puantaj tutmak için önce işçilerini ve yevmiyelerini ekle."
          action={<Button title="İşçi ekle" icon="plus" onPress={() => router.push('/worker/new')} />}
        />
      ) : (
        data && (
          <>
            <Appear index={1}>
              <HeroCard
                label={isToday ? `${greeting()} · bugün` : formatDateLong(date)}
                amount={dayTotal}
                caption={`${present}/${workers.length} kişi işte${otHours > 0 ? ` · ${formatNumber(otHours)} saat mesai` : ''}`}
              >
                <AnimatedBar value={workers.length ? dayRecords.length / workers.length : 0} color={palette.brand} track={palette.heroLine} />
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <PressableScale
                    onPress={() => (unmarked > 0 ? bulk('fill-full') : setBulkOpen(true))}
                    disabled={bulkBusy}
                    style={[heroBtn, { flex: 1, backgroundColor: palette.heroText }]}
                  >
                    <Feather name={unmarked > 0 ? 'check' : 'check-circle'} size={16} color={palette.textPrimary} />
                    <Text variant="ui" weight="semibold">
                      {bulkBusy ? 'Kaydediliyor…' : unmarked > 0 ? `Kalan ${unmarked} kişiye tam gün` : 'Gün tamam'}
                    </Text>
                  </PressableScale>
                  <PressableScale onPress={() => setBulkOpen(true)} style={[heroBtn, { backgroundColor: palette.heroLine, paddingHorizontal: space.md }]} accessibilityLabel="Toplu işlemler">
                    <Feather name="more-horizontal" size={18} color={palette.heroText} />
                  </PressableScale>
                </View>
              </HeroCard>
            </Appear>

            <Section label={`Ekip · ${workers.length}`}>
              {workers.map((w, i) => {
                const a = today.get(w.id);
                const ot = a?.overtime_hours ?? 0;
                return (
                  <Appear key={w.id} index={i + 2}>
                    <Card style={{ gap: space.md }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                        <Avatar name={w.full_name} size={40} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="title" onPress={() => router.push(`/worker/${w.id}`)} numberOfLines={1}>
                            {w.full_name}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: space.xs }}>
                            <Chip label={ROLE_LABELS[w.role] ?? 'İşçi'} tone={roleTone(w.role ?? 'diger')} />
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text variant="ui" weight="semibold" numeric>
                            {a ? formatMoney(attendanceEarning(a)) : formatMoney(w.daily_wage)}
                          </Text>
                          <Text variant="caption" tone="tertiary">
                            {a ? STATUS_LABELS[a.status] : 'yevmiye'}
                          </Text>
                        </View>
                      </View>
                      <Segmented options={OPTIONS} value={a?.status ?? null} onChange={(s) => mark(w, s)} />
                      {a && !a.id.startsWith('tmp-') && (
                        <PressableScale onPress={() => setOvertimeFor({ record: a, name: w.full_name })} style={[otBtn, ot > 0 && { backgroundColor: 'rgba(255,138,61,0.14)' }]}>
                          <Feather name="clock" size={14} color={ot > 0 ? '#C25A12' : palette.textSecondary} />
                          <Text variant="caption" weight="medium" color={ot > 0 ? '#C25A12' : palette.textSecondary}>
                            {ot > 0 ? `${formatNumber(ot)} saat mesai · ${formatMoney(ot * a.overtime_rate)}` : 'Mesai / not ekle'}
                          </Text>
                          {a.note ? <Feather name="file-text" size={13} color={palette.textTertiary} /> : null}
                        </PressableScale>
                      )}
                    </Card>
                  </Appear>
                );
              })}
            </Section>
            <Hint>Seçili duruma tekrar dokunursan o günün kaydı silinir. Geçmiş günleri yukarıdaki şeritten seçebilirsin.</Hint>
          </>
        )
      )}

      <ActionMenu
        visible={bulkOpen}
        title="Toplu işlem"
        onClose={() => setBulkOpen(false)}
        items={[
          { label: 'Kalanlara tam gün', subtitle: 'İşaretlenmemiş herkes', icon: 'check', ...statusTone.full, onPress: () => bulk('fill-full') },
          { label: 'Herkese yarım gün', subtitle: 'Yağmur, erken paydos', icon: 'cloud-rain', ...statusTone.half, onPress: () => bulk('all-half') },
          { label: 'Dünkü puantajı kopyala', subtitle: 'Dün kim nasıl çalıştıysa', icon: 'copy', color: '#C25A12', soft: 'rgba(255,138,61,0.14)', onPress: () => bulk('copy-yesterday') },
        ]}
      />
      <OvertimeSheet record={overtimeFor?.record ?? null} workerName={overtimeFor?.name ?? ''} onClose={() => setOvertimeFor(null)} onSave={saveOvertime} />
    </Screen>
  );
}

const heroBtn = { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 44, borderRadius: radius.sm } as const;
const otBtn = {
  flexDirection: 'row',
  alignItems: 'center',
  gap: space.sm,
  alignSelf: 'flex-start',
  height: 32,
  paddingHorizontal: space.md,
  borderRadius: radius.pill,
  backgroundColor: palette.control,
} as const;
