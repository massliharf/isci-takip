import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Card, colors, DateStepper, ErrorText, Loading, Muted, Screen, Segmented } from '../../components/ui';
import { clearAttendance, listAttendance, listWorkers, setAttendance } from '../../lib/api';
import { attendanceEarning } from '../../lib/calc';
import { formatMoney, toISODate } from '../../lib/format';
import type { Attendance, AttendanceStatus, Worker } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';

const OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'full', label: 'Tam', color: colors.green },
  { value: 'half', label: 'Yarım', color: colors.blue },
  { value: 'leave', label: 'İzinli', color: colors.amber },
  { value: 'absent', label: 'Gelmedi', color: colors.red },
];

export default function PuantajScreen() {
  const [date, setDate] = useState(toISODate(new Date()));
  const [saving, setSaving] = useState<string | null>(null);
  const { data, setData, error, loading } = useFocusData(async () => {
    const [workers, attendance] = await Promise.all([listWorkers(true), listAttendance(date, date)]);
    return { workers, attendance };
  }, [date]);

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
      Alert.alert('Kaydedilemedi', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  }

  async function markAllFull() {
    if (!data) return;
    const missing = data.workers.filter((w) => !data.attendance.some((a) => a.worker_id === w.id));
    try {
      const saved = await Promise.all(missing.map((w) => setAttendance(w, date, 'full')));
      setData({ ...data, attendance: [...data.attendance, ...saved] });
    } catch (e) {
      Alert.alert('Kaydedilemedi', e instanceof Error ? e.message : String(e));
    }
  }

  const dayTotal = data?.attendance.reduce((t, a) => t + attendanceEarning(a), 0) ?? 0;
  const unmarked = data ? data.workers.filter((w) => !data.attendance.some((a) => a.worker_id === w.id)).length : 0;

  return (
    <Screen>
      <DateStepper value={date} onChange={setDate} />
      <ErrorText>{error}</ErrorText>
      {loading && !data ? (
        <Loading />
      ) : data && data.workers.length === 0 ? (
        <Card>
          <Muted>Henüz aktif işçi yok.</Muted>
          <View style={{ height: 10 }} />
          <Button title="İşçi Ekle" onPress={() => router.push('/worker/new')} />
        </Card>
      ) : (
        data && (
          <>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Muted>Günlük işçilik</Muted>
                <Text style={{ fontSize: 20, fontWeight: '700' }}>{formatMoney(dayTotal)}</Text>
              </View>
              {unmarked > 0 && <Button small title={`Kalan ${unmarked} kişi: Tam gün`} onPress={markAllFull} />}
            </Card>
            {data.workers.map((w) => {
              const a = data.attendance.find((x) => x.worker_id === w.id);
              return (
                <Card key={w.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700' }} onPress={() => router.push(`/worker/${w.id}`)}>
                      {w.full_name}
                    </Text>
                    <Muted>{saving === w.id ? 'Kaydediliyor…' : `${formatMoney(Number(w.daily_wage))}/gün`}</Muted>
                  </View>
                  <Segmented options={OPTIONS} value={a?.status ?? null} onChange={(s) => mark(w, s)} />
                </Card>
              );
            })}
            <Muted>İpucu: Seçili duruma tekrar dokunursanız o günün kaydı silinir.</Muted>
          </>
        )
      )}
    </Screen>
  );
}
