import { useState } from 'react';
import { errorMessage } from '../lib/dialog';
import { formatMoney, parseMoney, toISODate } from '../lib/format';
import { successFeedback } from '../lib/haptics';
import { useToast } from './Toast';
import { Button, Card, DateField, ErrorText, Field, FormStack, QuickChips } from './ui';

export function MoneyEntryForm({
  descriptionLabel,
  descriptionPresets,
  successLabel,
  onSubmit,
}: {
  descriptionLabel: string;
  /** Sık kullanılan açıklamalar, tek dokunuşla doldurulur */
  descriptionPresets: string[];
  successLabel: string;
  onSubmit: (v: { date: string; amount: number; description: string | null }) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function save() {
    const value = parseMoney(amount);
    if (!(value > 0)) return setError('Geçerli bir tutar girin');
    setBusy(true);
    try {
      await onSubmit({ date, amount: value, description: description.trim() || null });
      successFeedback();
      toast(`${successLabel}: ${formatMoney(value)}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <FormStack>
          <Field label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus placeholder="0" />
          <Field label={descriptionLabel} value={description} onChangeText={setDescription} />
          <QuickChips options={descriptionPresets.map((p) => ({ label: p, value: p }))} onSelect={setDescription} />
          <DateField label="Tarih" value={date} onChange={setDate} />
        </FormStack>
      </Card>
      <ErrorText>{error}</ErrorText>
      <Button title="Kaydet" size="lg" onPress={save} loading={busy} disabled={!amount.trim()} />
    </>
  );
}
