import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  Card,
  currentYearMonth,
  Divider,
  ErrorText,
  Hint,
  IconBox,
  Loading,
  MonthStepper,
  Screen,
  Section,
  Text,
  type IconName,
} from '../../components/ui';
import { deleteExpense, deleteIncome, deletePayment, listExpenses, listIncomes, listPayments, listWorkers } from '../../lib/api';
import { formatDate, formatMoney, monthRange } from '../../lib/format';
import { PAYMENT_LABELS } from '../../lib/types';
import { confirmAction, errorMessage, showMessage } from '../../lib/dialog';
import { useFocusData } from '../../lib/useAsync';
import { categoryTone, palette, space } from '../../theme/tokens';

type Entry = { id: string; title: string; sub: string; amount: number; onDelete: () => Promise<void> };

function EntryList({
  label,
  entries,
  icon,
  tone,
  sign,
  onDelete,
}: {
  label: string;
  entries: Entry[];
  icon: IconName;
  tone: { color: string; soft: string };
  sign: '+' | '−';
  onDelete: (e: Entry) => void;
}) {
  const total = entries.reduce((t, e) => t + e.amount, 0);
  return (
    <Section
      label={label}
      right={
        <Text variant="caption" weight="semibold" tone="secondary">
          {formatMoney(total)}
        </Text>
      }
    >
      {entries.length === 0 ? (
        <Card>
          <Text variant="caption" tone="tertiary" align="center">
            Bu ay kayıt yok
          </Text>
        </Card>
      ) : (
        <Card padded={false}>
          {entries.map((e, i) => (
            <View key={e.id}>
              {i > 0 && <Divider inset={space.lg + 40 + space.md} />}
              <Pressable
                onLongPress={() => onDelete(e)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  padding: space.lg,
                  backgroundColor: pressed ? palette.controlActive : 'transparent',
                })}
              >
                <IconBox icon={icon} {...tone} />
                <View style={{ flex: 1 }}>
                  <Text variant="ui" numberOfLines={1}>
                    {e.title}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {e.sub}
                  </Text>
                </View>
                <Text variant="ui" weight="semibold">
                  {sign} {formatMoney(e.amount)}
                </Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Section>
  );
}

export default function FinanceScreen() {
  const [ym, setYm] = useState(currentYearMonth());
  const { start, end } = monthRange(ym.year, ym.month);
  const { data, error, loading, reload } = useFocusData(async () => {
    const [incomes, expenses, payments, workers] = await Promise.all([
      listIncomes(start, end),
      listExpenses(start, end),
      listPayments(start, end),
      listWorkers(),
    ]);
    return { incomes, expenses, payments, workers };
  }, start);

  function confirmDelete(e: Entry) {
    confirmAction({
      title: 'Kaydı sil',
      message: `${e.title} · ${formatMoney(e.amount)} silinsin mi?`,
      confirmText: 'Sil',
      onConfirm: async () => {
        await e.onDelete().catch((err) => showMessage('Silinemedi', errorMessage(err)));
        reload();
      },
    });
  }

  const workerName = (id: string) => data?.workers.find((w) => w.id === id)?.full_name ?? '?';

  return (
    <Screen>
      <MonthStepper value={ym} onChange={setYm} />
      <ErrorText>{error}</ErrorText>
      {loading && !data && <Loading />}
      {data && (
        <>
          <EntryList
            label="Gelirler"
            icon="arrow-down-left"
            tone={categoryTone.income}
            sign="+"
            onDelete={confirmDelete}
            entries={data.incomes.map((i) => ({
              id: i.id,
              title: i.description || 'Gelir',
              sub: formatDate(i.income_date),
              amount: Number(i.amount),
              onDelete: () => deleteIncome(i.id),
            }))}
          />
          <EntryList
            label="İşçilere verilen"
            icon="user-check"
            tone={categoryTone.payment}
            sign="−"
            onDelete={confirmDelete}
            entries={data.payments.map((p) => ({
              id: p.id,
              title: workerName(p.worker_id),
              sub: `${formatDate(p.pay_date)} · ${PAYMENT_LABELS[p.kind]}${p.note ? ` · ${p.note}` : ''}`,
              amount: Number(p.amount),
              onDelete: () => deletePayment(p.id),
            }))}
          />
          <EntryList
            label="Diğer giderler"
            icon="arrow-up-right"
            tone={categoryTone.expense}
            sign="−"
            onDelete={confirmDelete}
            entries={data.expenses.map((e) => ({
              id: e.id,
              title: e.description || 'Gider',
              sub: formatDate(e.expense_date),
              amount: Number(e.amount),
              onDelete: () => deleteExpense(e.id),
            }))}
          />
          <Hint>Yeni kayıt için sağ üstteki + butonunu kullan. Silmek için kayda basılı tut.</Hint>
        </>
      )}
    </Screen>
  );
}
