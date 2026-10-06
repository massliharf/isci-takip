import { router, Stack, useLocalSearchParams } from 'expo-router';
import { createExpense, createIncome, deleteExpense, deleteIncome, getExpense, getIncome, updateExpense, updateIncome } from '../lib/api';
import { confirmAction, errorMessage } from '../lib/dialog';
import { formatMoney } from '../lib/format';
import { useFocusData } from '../lib/useAsync';
import { MoneyEntryForm } from './MoneyEntryForm';
import { useToast } from './Toast';
import { ErrorText, Loading, Screen } from './ui';

/** Gelir/gider ekleme ve düzenleme ekranı. `?id=` verilirse kayıt yüklenir ve güncellenir. */
export function MoneyEntryScreen({ kind }: { kind: 'income' | 'expense' }) {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const toast = useToast();
  const label = kind === 'income' ? 'Gelir' : 'Gider';
  const { data, error } = useFocusData(async () => {
    if (!id) return null;
    if (kind === 'income') {
      const r = await getIncome(id);
      return { ...r, date: r.income_date };
    }
    const r = await getExpense(id);
    return { ...r, date: r.expense_date };
  }, `${kind}:${id ?? 'new'}`);

  if (id && !data) return <Screen>{error ? <ErrorText>{error}</ErrorText> : <Loading />}</Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: id ? `${label}i düzenle` : `${label} ekle` }} />
      <MoneyEntryForm
        kind={kind}
        initial={data ? { date: data.date, amount: data.amount, category: data.category, method: data.method, site: data.site, description: data.description } : undefined}
        onSubmit={async ({ date, ...rest }) => {
          if (kind === 'income') await (id ? updateIncome(id, { income_date: date, ...rest }) : createIncome({ income_date: date, ...rest }));
          else await (id ? updateExpense(id, { expense_date: date, ...rest }) : createExpense({ expense_date: date, ...rest }));
          router.back();
        }}
        onDelete={
          id && data
            ? () =>
                confirmAction({
                  title: 'Kaydı sil',
                  message: `${formatMoney(data.amount)} tutarındaki ${label.toLocaleLowerCase('tr')} silinsin mi?`,
                  confirmText: 'Sil',
                  onConfirm: async () => {
                    try {
                      await (kind === 'income' ? deleteIncome(id) : deleteExpense(id));
                      toast('Kayıt silindi');
                      router.back();
                    } catch (e) {
                      toast(`Silinemedi: ${errorMessage(e)}`, 'error');
                    }
                  },
                })
            : undefined
        }
      />
    </Screen>
  );
}
