import { useState } from 'react';
import { View } from 'react-native';
import { overtimeAmount } from '../lib/calc';
import { formatDateLong, formatMoney } from '../lib/format';
import type { Attendance } from '../lib/types';
import { space } from '../theme/tokens';
import { Button, Field, NumberStepper, QuickChips, Sheet, Text } from './ui';

/** Bir günün mesai saatini ve notunu düzenler */
export function OvertimeSheet({
  record,
  workerName,
  onClose,
  onSave,
}: {
  record: Attendance | null;
  workerName: string;
  onClose: () => void;
  onSave: (hours: number, note: string | null) => Promise<void>;
}) {
  return (
    <Sheet visible={!!record} title={`${workerName} · mesai`} subtitle={record ? formatDateLong(record.work_date) : undefined} onClose={onClose}>
      {/* Her kayıt için form sıfırdan kurulsun */}
      {record && <OvertimeForm key={record.id} record={record} onSave={onSave} />}
    </Sheet>
  );
}

function OvertimeForm({ record, onSave }: { record: Attendance; onSave: (hours: number, note: string | null) => Promise<void> }) {
  const [hours, setHours] = useState(record.overtime_hours);
  const [note, setNote] = useState(record.note ?? '');
  const [busy, setBusy] = useState(false);
  const amount = overtimeAmount({ overtime_hours: hours, overtime_rate: record.overtime_rate });

  return (
    <View style={{ gap: space.lg }}>
      <NumberStepper value={hours} onChange={setHours} step={0.5} max={12} unit="saat" />
      <QuickChips options={[1, 2, 3, 4].map((h) => ({ label: `${h} saat`, value: String(h) }))} onSelect={(v) => setHours(Number(v))} />
      <Text variant="caption" tone="secondary" align="center">
        {formatMoney(record.overtime_rate)} / saat → mesai ücreti <Text variant="caption" weight="semibold">{formatMoney(amount)}</Text>
      </Text>
      <Field label="Günün notu" value={note} onChangeText={setNote} placeholder="ör. Kartal şantiyesi, 3. kat duvar" />
      <Button
        title="Kaydet"
        size="lg"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await onSave(hours, note.trim() || null);
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}
