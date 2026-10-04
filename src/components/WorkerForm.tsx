import { useState } from 'react';
import { Switch, View } from 'react-native';
import type { WorkerInput } from '../lib/api';
import { isValidISODate, parseMoney, toISODate } from '../lib/format';
import { palette, space } from '../theme/tokens';
import { Button, Card, ErrorText, Field, FormStack, Hint, Text } from './ui';

export function WorkerForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<WorkerInput>;
  submitLabel: string;
  onSubmit: (input: WorkerInput) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [wage, setWage] = useState(initial?.daily_wage != null ? String(initial.daily_wage) : '');
  const [startDate, setStartDate] = useState(initial?.start_date ?? toISODate(new Date()));
  const [active, setActive] = useState(initial?.active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const dailyWage = parseMoney(wage);
    if (!fullName.trim()) return setError('İsim gerekli');
    if (!(dailyWage >= 0)) return setError('Geçerli bir yevmiye girin');
    if (!isValidISODate(startDate)) return setError('Başlangıç tarihi YYYY-AA-GG formatında olmalı');
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        daily_wage: dailyWage,
        start_date: startDate,
        active,
        notes: notes.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <FormStack>
          <Field label="Ad soyad" value={fullName} onChangeText={setFullName} />
          <Field label="Günlük yevmiye (₺)" value={wage} onChangeText={setWage} keyboardType="decimal-pad" placeholder="Örn. 1500" />
          {initial?.daily_wage != null && <Hint>Yevmiye değişikliği yalnızca bundan sonra girilecek puantajlara uygulanır.</Hint>}
          <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="İşe başlama tarihi" value={startDate} onChangeText={setStartDate} placeholder="YYYY-AA-GG" />
          <Field label="Not" value={notes} onChangeText={setNotes} multiline />
        </FormStack>
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="title">Aktif çalışıyor</Text>
          <Text variant="caption" tone="secondary">
            Pasif işçiler puantaj listesinde görünmez
          </Text>
        </View>
        <Switch value={active} onValueChange={setActive} trackColor={{ true: palette.focus, false: palette.track }} thumbColor={palette.surface} />
      </Card>
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} size="lg" onPress={submit} loading={busy} disabled={!fullName.trim() || !wage.trim()} />
    </>
  );
}
