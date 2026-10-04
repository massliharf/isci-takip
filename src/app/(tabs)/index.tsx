import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useToast } from '../../components/Toast';
import { Avatar, Button, Card, EmptyState, ErrorText, Hint, Loading, Progress, Screen, Section, Segmented, Text } from '../../components/ui';
import { weekStart, WeekStrip } from '../../components/WeekStrip';
import { clearAttendance, listAttendance, listWorkers, setAttendance } from '../../lib/api';
import { attendanceEarning } from '../../lib/calc';
import { errorMessage } from '../../lib/dialog';
import { addDays, formatDateLong, formatMoney, toISODate } from '../../lib/format';
import { successFeedback, tapFeedback } from '../../lib/haptics';
import type { Attendance, AttendanceStatus, Worker } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';
import { space, statusTone } from '../../theme/tokens';

const OPTIONS: { value: AttendanceStatus; label: string; tone: (typeof statusTone)[AttendanceStatus] }[] = [
  { value: 'full', label: 'Tam', tone: statusTone.full },
  { value: 'half', label: 'Yarım', tone: statusTone.half },
  { value: 'leave', label: 'İzinli', tone: statusTone.leave },
  { value: 'absent', label: 'Yok', tone: statusTone.absent },
];

export default function PuantajScreen() {
  const [date, setDate] = useState(toISODate(new Date()));
  const [bulkSaving, setBulkSaving] = useState(false);
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

  /** Ekranı hemen günceller, sunucu hatasında geri alır */
  async function mark(worker: Worker, status: AttendanceStatus) {
    if (!data) return;
    tapFeedback();
    const before = data.attendance;
    const current = today.get(worker.id);
    const others = before.filter((a) => !(a.worker_id === worker.id && a.work_date === date));
    const removing = current?.status === status;
    const optimistic: Attendance = { id: current?.id ?? `tmp-${worker.id}`, worker_id: worker.id, work_date: date, status, daily_wage: current?.daily_wage ?? worker.daily_wage, note: null };
    setData({ ...data, attendance: removing ? others : [...others, optimistic] });
    try {
      if (removing) await clearAttendance(worker.id, date);
      else {
        const saved = await setAttendance(current ? { id: worker.id, daily_wage: current.daily_wage } : worker, date, status);
        setData((d) => d && { ...d, attendance: [...d.attendance.filter((a) => !(a.worker_id === worker.id && a.work_date === date)), saved] });
      }
    } catch (e) {
      setData((d) => d && { ...d, attendance: before });
      toast(`Kaydedilemedi: ${errorMessage(e)}`, 'error');
    }
  }

  async function markAllFull() {
    if (!data) return;
    const missing = data.workers.filter((w) => !today.has(w.id));
    setBulkSaving(true);
    try {
      const saved = await Promise.all(missing.map((w) => setAttendance(w, date, 'full')));
      setData((d) => d && { ...d, attendance: [...d.attendance, ...saved] });
      successFeedback();
      toast(`${saved.length} kişiye tam gün yazıldı`);
    } catch (e) {
      toast(`Kaydedilemedi: ${errorMessage(e)}`, 'error');
    } finally {
      setBulkSaving(false);
    }
  }

  const workers = data?.workers ?? [];
  const dayRecords = workers.map((w) => today.get(w.id)).filter((a): a is Attendance => !!a);
  const dayTotal = dayRecords.reduce((t, a) => t + attendanceEarning(a), 0);
  const present = dayRecords.filter((a) => a.status === 'full' || a.status === 'half').length;
  const unmarked = workers.length - dayRecords.length;

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <WeekStrip value={date} onChange={setDate} marked={marked} total={workers.length} />
      <ErrorText>{error}</ErrorText>
      {loading && !data ? (
        <Loading />
      ) : data && workers.length === 0 ? (
        <EmptyState
          icon="users"
          title="Henüz işçi yok"
          description="Puantaj tutmak için önce işçilerini ve yevmiyelerini ekle."
          action={<Button title="İşçi ekle" icon="plus" onPress={() => router.push('/worker/new')} />}
        />
      ) : (
        data && (
          <>
            <Card style={{ gap: space.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <View style={{ gap: 2 }}>
                  <Text variant="overline" tone="secondary">
                    {formatDateLong(date)}
                  </Text>
                  <Text variant="display">{formatMoney(dayTotal)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="title" weight="semibold">
                    {present}/{workers.length}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    işte
                  </Text>
                </View>
              </View>
              <Progress value={workers.length ? dayRecords.length / workers.length : 0} />
              {unmarked > 0 ? (
                <Button title={`Kalan ${unmarked} kişiye tam gün yaz`} icon="check" variant="secondary" size="sm" onPress={markAllFull} loading={bulkSaving} />
              ) : (
                <Text variant="caption" tone="positive" weight="medium">
                  Bu günün puantajı tamam
                </Text>
              )}
            </Card>
            <Section label={`Ekip · ${workers.length}`}>
              {workers.map((w) => {
                const a = today.get(w.id);
                return (
                  <Card key={w.id} style={{ gap: space.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                      <Avatar name={w.full_name} size={36} />
                      <Text variant="title" onPress={() => router.push(`/worker/${w.id}`)} numberOfLines={1} style={{ flex: 1 }}>
                        {w.full_name}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {a ? formatMoney(attendanceEarning(a)) : `${formatMoney(w.daily_wage)} / gün`}
                      </Text>
                    </View>
                    <Segmented options={OPTIONS} value={a?.status ?? null} onChange={(s) => mark(w, s)} />
                  </Card>
                );
              })}
            </Section>
            <Hint>Seçili duruma tekrar dokunursan o günün kaydı silinir. Geçmiş günleri yukarıdaki şeritten seçebilirsin.</Hint>
          </>
        )
      )}
    </Screen>
  );
}
