import { useState } from 'react';
import { View } from 'react-native';
import type { MoneyInput } from '../lib/api';
import { listSites } from '../lib/api';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/categories';
import { errorMessage } from '../lib/dialog';
import { formatMoney, parseMoney, toISODate } from '../lib/format';
import { successFeedback } from '../lib/haptics';
import { METHOD_LABELS, type PayMethod } from '../lib/types';
import { useFocusData } from '../lib/useAsync';
import { space } from '../theme/tokens';
import { useToast } from './Toast';
import { Button, Card, ChoiceChips, DateField, ErrorText, Field, FormStack, QuickChips, Section, Text } from './ui';

/** Gelir ve gider girişi: tutar, kategori, ödeme yöntemi, şantiye, tarih, açıklama */
export function MoneyEntryForm({
  kind,
  onSubmit,
}: {
  kind: 'income' | 'expense';
  onSubmit: (v: MoneyInput & { date: string }) => Promise<void>;
}) {
  const categories = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0].key);
  const [method, setMethod] = useState<PayMethod>(kind === 'income' ? 'banka' : 'nakit');
  const [site, setSite] = useState('');
  const [date, setDate] = useState(toISODate(new Date()));
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { data: sites } = useFocusData(() => listSites().catch(() => [] as string[]), 'sites');

  async function save() {
    const value = parseMoney(amount);
    if (!(value > 0)) return setError('Geçerli bir tutar girin');
    setBusy(true);
    try {
      await onSubmit({ date, amount: value, category, method, site: site.trim() || null, description: description.trim() || null });
      successFeedback();
      toast(`${kind === 'income' ? 'Gelir' : 'Gider'} kaydedildi: ${formatMoney(value)}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <FormStack>
          <Field label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" autoFocus placeholder="0" style={{ fontSize: 24, height: 56 }} />
          <View style={{ gap: space.sm }}>
            <Text variant="overline" tone="secondary">
              Kategori
            </Text>
            <ChoiceChips options={categories.map((c) => ({ value: c.key, label: c.label, icon: c.icon, color: c.color, soft: c.soft }))} value={category} onChange={setCategory} />
          </View>
        </FormStack>
      </Card>

      <Section label="Ayrıntı">
        <Card>
          <FormStack>
            <View style={{ gap: space.sm }}>
              <Text variant="overline" tone="secondary">
                Ödeme şekli
              </Text>
              <ChoiceChips<PayMethod>
                options={[
                  { value: 'nakit', label: METHOD_LABELS.nakit, icon: 'dollar-sign' },
                  { value: 'banka', label: METHOD_LABELS.banka, icon: 'briefcase' },
                  { value: 'kart', label: METHOD_LABELS.kart, icon: 'credit-card' },
                ]}
                value={method}
                onChange={setMethod}
              />
            </View>
            <Field label="Şantiye / proje" value={site} onChangeText={setSite} placeholder="İsteğe bağlı (ör. Kartal konut)" />
            {sites && sites.length > 0 && <QuickChips options={sites.slice(0, 6).map((s) => ({ label: s, value: s }))} onSelect={setSite} />}
            <DateField label="Tarih" value={date} onChange={setDate} />
            <Field label="Açıklama" value={description} onChangeText={setDescription} placeholder={kind === 'income' ? 'ör. 2. hakediş' : 'ör. 2 palet tuğla'} />
          </FormStack>
        </Card>
      </Section>
      <ErrorText>{error}</ErrorText>
      <Button title="Kaydet" size="lg" onPress={save} loading={busy} disabled={!amount.trim()} />
    </>
  );
}
