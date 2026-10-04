import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import type { WorkerInput } from '../lib/api';
import { isValidISODate, parseMoney, toISODate } from '../lib/format';
import { Button, Card, ErrorText, Field, Muted } from './ui';

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
    <Card>
      <Field label="Ad Soyad" value={fullName} onChangeText={setFullName} />
      <Field label="Günlük yevmiye (₺)" value={wage} onChangeText={setWage} keyboardType="decimal-pad" placeholder="Örn. 1500" />
      <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="İşe başlama tarihi (YYYY-AA-GG)" value={startDate} onChangeText={setStartDate} />
      <Field label="Not" value={notes} onChangeText={setNotes} multiline />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View>
          <Text style={{ fontSize: 16 }}>Aktif çalışıyor</Text>
          <Muted>Pasif işçiler puantaj listesinde görünmez</Muted>
        </View>
        <Switch value={active} onValueChange={setActive} />
      </View>
      {initial?.daily_wage != null && (
        <Muted>Yevmiye değişikliği yalnızca bundan sonra girilecek puantajlara uygulanır.</Muted>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} onPress={submit} loading={busy} />
    </Card>
  );
}
