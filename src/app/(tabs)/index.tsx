import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, DateStepper, EmptyState, ErrorText, Hint, Loading, Screen, Section, Segmented, Stat, Text } from '../../components/ui';
import { clearAttendance, listAttendance, listWorkers, setAttendance } from '../../lib/api';
import { attendanceEarning } from '../../lib/calc';
import { formatMoney, toISODate } from '../../lib/format';
import type { Attendance, AttendanceStatus, Worker } from '../../lib/types';
import { errorMessage, showMessage } from '../../lib/dialog';
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
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const { data, setData, error, loading } = useFocusData(async () => {
    const [workers, attendance] = await Promise.all([listWorkers(true), listAttendance(date, date)]);
    return { workers, attendance };
  }, date);

  async function mark(worker: Worker, status: AttendanceStatus) {
    if (!data) return;
    const current = data.attendance.find((a) => a.worker_id === worker.id);
    setSaving(worker.id);
    try {
      let next: Attendance[];
      if (current?.status === status) {
        // Aynı duruma tekrar basmak kaydı siler
        await clearAttendance(worker.id, date);
        next = data.attendance.filter((a) => a.worker_id !== worker.id);
      } else {
        const saved = await setAttendance(worker, date, status);
        next = [...data.attendance.filter((a) => a.worker_id !== worker.id), saved];
      }
      setData({ ...data, attendance: next });
    } catch (e) {
      showMessage('Kaydedilemedi', errorMessage(e));
    } finally {
      setSaving(null);
    }
  }

  async function markAllFull() {
    if (!data) return;
    const missing = data.workers.filter((w) => !data.attendance.some((a) => a.worker_id === w.id));
    setBulkSaving(true);
    try {
      const saved = await Promise.all(missing.map((w) => setAttendance(w, date, 'full')));
      setData({ ...data, attendance: [...data.attendance, ...saved] });
    } catch (e) {
      showMessage('Kaydedilemedi', errorMessage(e));
    } finally {
      setBulkSaving(false);
    }
  }

  const dayTotal = data?.attendance.reduce((t, a) => t + attendanceEarning(a), 0) ?? 0;
  const marked = data?.attendance.length ?? 0;
  const unmarked = data ? data.workers.length - data.workers.filter((w) => data.attendance.some((a) => a.worker_id === w.id)).length : 0;

  return (
    <Screen>
      <DateStepper value={date} onChange={setDate} />
      <ErrorText>{error}</ErrorText>
      {loading && !data ? (
        <Loading />
      ) : data && data.workers.length === 0 ? (
        <EmptyState
          icon="users"
          title="Henüz işçi yok"
          description="Puantaj tutmak için önce işçilerini ekle."
          action={<Button title="İşçi ekle" icon="plus" onPress={() => router.push('/worker/new')} />}
        />
      ) : (
        data && (
          <>
            <Card style={{ gap: space.md }}>
              <Stat label="Günlük işçilik" value={formatMoney(dayTotal)} caption={`${marked} / ${data.workers.length} işçi işaretlendi`} />
              {unmarked > 0 && (
                <Button title={`Kalan ${unmarked} kişiye tam gün yaz`} icon="check" variant="secondary" size="sm" onPress={markAllFull} loading={bulkSaving} />
              )}
            </Card>
            <Section label="İşçiler">
              {data.workers.map((w) => {
                const a = data.attendance.find((x) => x.worker_id === w.id);
                return (
                  <Card key={w.id} style={{ gap: space.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text variant="title" onPress={() => router.push(`/worker/${w.id}`)} numberOfLines={1} style={{ flexShrink: 1 }}>
                        {w.full_name}
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        {saving === w.id ? 'Kaydediliyor…' : a ? formatMoney(attendanceEarning(a)) : `${formatMoney(Number(w.daily_wage))} / gün`}
                      </Text>
                    </View>
                    <Segmented options={OPTIONS} value={a?.status ?? null} onChange={(s) => mark(w, s)} />
                  </Card>
                );
              })}
            </Section>
            <Hint>Seçili duruma tekrar dokunursan o günün kaydı silinir.</Hint>
          </>
        )
      )}
    </Screen>
  );
}
