import { useState } from 'react';
import { parseMoney, toISODate } from '../lib/format';
import { Button, Card, DateField, ErrorText, Field } from './ui';

export function MoneyEntryForm({
  descriptionLabel,
  onSubmit,
}: {
  descriptionLabel: string;
  onSubmit: (v: { date: string; amount: number; description: string | null }) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const value = parseMoney(amount);
    if (!(value > 0)) return setError('Geçerli bir tutar girin');
    setBusy(true);
    try {
      await onSubmit({ date, amount: value, description: description.trim() || null });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <Card>
      <Field label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus />
      <DateField label="Tarih" value={date} onChange={setDate} />
      <Field label={descriptionLabel} value={description} onChangeText={setDescription} />
      <ErrorText>{error}</ErrorText>
      <Button title="Kaydet" onPress={save} loading={busy} />
    </Card>
  );
}
