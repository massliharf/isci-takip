import { useMemo, useState } from 'react';
import { ExportMenu } from '../../components/ExportMenu';
import { useToast } from '../../components/Toast';
import {
  Card,
  currentYearMonth,
  Divider,
  EmptyState,
  ErrorText,
  Hint,
  IconBox,
  Kpi,
  KpiRow,
  ListCard,
  ListRow,
  Loading,
  moneyTone,
  MonthStepper,
  Screen,
  Section,
  Segmented,
  Stat,
  type IconName,
} from '../../components/ui';
import { deleteExpense, deleteIncome, deletePayment, listExpenses, listIncomes, listPayments, listWorkers } from '../../lib/api';
import { safeFileName } from '../../lib/csv';
import { confirmAction, errorMessage } from '../../lib/dialog';
import { cashCsv, monthLabel } from '../../lib/documents';
import { exportCsv } from '../../lib/export';
import { formatDate, formatMoney, monthRange } from '../../lib/format';
import { PAYMENT_LABELS } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';
import { categoryTone, space } from '../../theme/tokens';

type Kind = 'income' | 'payment' | 'expense';
type Filter = 'all' | Kind;

type Entry = {
  id: string;
  kind: Kind;
  date: string;
  title: string;
  sub: string;
  amount: number;
  remove: () => Promise<void>;
};

const KIND: Record<Kind, { icon: IconName; tone: { color: string; soft: string }; sign: '+' | '−' }> = {
  income: { icon: 'arrow-down-left', tone: categoryTone.income, sign: '+' },
  payment: { icon: 'user-check', tone: categoryTone.payment, sign: '−' },
  expense: { icon: 'arrow-up-right', tone: categoryTone.expense, sign: '−' },
};

export default function FinanceScreen() {
  const [ym, setYm] = useState(currentYearMonth());
  const [filter, setFilter] = useState<Filter>('all');
  const toast = useToast();
  const { start, end } = monthRange(ym.year, ym.month);
  const { data, error, loading, reload } = useFocusData(async () => {
    const [incomes, expenses, payments, workers] = await Promise.all([listIncomes(start, end), listExpenses(start, end), listPayments(start, end), listWorkers()]);
    return { incomes, expenses, payments, workers };
  }, start);

  const workerName = useMemo(() => {
    const m = new Map(data?.workers.map((w) => [w.id, w.full_name]));
    return (id: string) => m.get(id) ?? 'Silinmiş işçi';
  }, [data]);

  const entries = useMemo<Entry[]>(() => {
    if (!data) return [];
    return [
      ...data.incomes.map((i) => ({ id: i.id, kind: 'income' as const, date: i.income_date, title: i.description || 'Gelir', sub: 'Gelir', amount: i.amount, remove: () => deleteIncome(i.id) })),
      ...data.payments.map((p) => ({
        id: p.id,
        kind: 'payment' as const,
        date: p.pay_date,
        title: workerName(p.worker_id),
        sub: `${PAYMENT_LABELS[p.kind]}${p.note ? ` · ${p.note}` : ''}`,
        amount: p.amount,
        remove: () => deletePayment(p.id),
      })),
      ...data.expenses.map((e) => ({ id: e.id, kind: 'expense' as const, date: e.expense_date, title: e.description || 'Gider', sub: 'Gider', amount: e.amount, remove: () => deleteExpense(e.id) })),
    ].sort((a, b) => b.date.localeCompare(a.date));
  }, [data, workerName]);

  const sum = (k: Kind) => entries.filter((e) => e.kind === k).reduce((t, e) => t + e.amount, 0);
  const income = sum('income');
  const paid = sum('payment');
  const expense = sum('expense');
  const net = income - paid - expense;

  // Günlere göre grupla: hangi gün ne olduğu tek bakışta görünsün
  const groups = useMemo(() => {
    const shown = entries.filter((e) => filter === 'all' || e.kind === filter);
    const m = new Map<string, Entry[]>();
    for (const e of shown) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return [...m.entries()];
  }, [entries, filter]);

  function confirmDelete(e: Entry) {
    confirmAction({
      title: 'Kaydı sil',
      message: `${e.title} · ${formatMoney(e.amount)} silinsin mi?`,
      confirmText: 'Sil',
      onConfirm: async () => {
        try {
          await e.remove();
          toast('Kayıt silindi');
          reload();
        } catch (err) {
          toast(`Silinemedi: ${errorMessage(err)}`, 'error');
        }
      },
    });
  }

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <MonthStepper value={ym} onChange={setYm} />
      <ErrorText>{error}</ErrorText>
      {loading && !data && <Loading />}
      {data && (
        <>
          <Card style={{ gap: space.md }}>
            <Stat label="Kasa net" value={formatMoney(net)} tone={moneyTone(net)} caption="Bu ay giren − çıkan para" />
            <Divider />
            <KpiRow>
              <Kpi label="Giren" value={formatMoney(income)} tone="positive" />
              <Kpi label="İşçilere" value={formatMoney(paid)} />
              <Kpi label="Gider" value={formatMoney(expense)} />
            </KpiRow>
          </Card>

          <Segmented<Filter>
            options={[
              { value: 'all', label: 'Tümü' },
              { value: 'income', label: 'Gelir' },
              { value: 'payment', label: 'İşçi' },
              { value: 'expense', label: 'Gider' },
            ]}
            value={filter}
            onChange={setFilter}
          />

          {groups.length === 0 ? (
            <EmptyState icon="inbox" title="Bu ay kayıt yok" description="Sağ üstteki + ile gelir, gider veya avans ekle." />
          ) : (
            groups.map(([date, items]) => (
              <Section key={date} label={formatDate(date)}>
                <ListCard>
                  {items.map((e) => (
                    <ListRow
                      key={e.id}
                      leading={<IconBox icon={KIND[e.kind].icon} {...KIND[e.kind].tone} />}
                      title={e.title}
                      subtitle={e.sub}
                      value={`${KIND[e.kind].sign} ${formatMoney(e.amount)}`}
                      valueTone={e.kind === 'income' ? 'positive' : 'primary'}
                      onLongPress={() => confirmDelete(e)}
                    />
                  ))}
                </ListCard>
              </Section>
            ))
          )}
          {entries.length > 0 && <Hint>Silmek için kayda basılı tut.</Hint>}
          <ExportMenu
            title={`${monthLabel(ym.year, ym.month)} kasa`}
            options={[
              {
                label: 'Excel — kasa dökümü',
                subtitle: 'Tarih sıralı tüm gelir, gider ve ödemeler',
                icon: 'grid',
                kind: 'excel',
                run: () => exportCsv(safeFileName(`Kasa ${monthLabel(ym.year, ym.month)}`), cashCsv(data.incomes, data.payments, data.expenses, workerName)),
              },
            ]}
          />
        </>
      )}
    </Screen>
  );
}
