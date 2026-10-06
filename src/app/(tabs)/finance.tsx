import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { ExportMenu } from '../../components/ExportMenu';
import { AnimatedBar, Appear, PressableScale } from '../../components/motion';
import { useToast } from '../../components/Toast';
import {
  Button,
  Card,
  ChoiceChips,
  currentYearMonth,
  EmptyState,
  ErrorText,
  Field,
  HeroCard,
  HeroStats,
  Hint,
  IconBox,
  ListCard,
  ListRow,
  Loading,
  MonthStepper,
  Screen,
  Section,
  Segmented,
  Sheet,
  Text,
  type IconName,
} from '../../components/ui';
import { deleteExpense, deleteIncome, deletePayment, listBudgets, listExpenses, listIncomes, listPayments, listWorkers, setBudget } from '../../lib/api';
import { categoryTotals } from '../../lib/calc';
import { EXPENSE_CATEGORIES, expenseCategory, incomeCategory } from '../../lib/categories';
import { safeFileName } from '../../lib/csv';
import { confirmAction, errorMessage } from '../../lib/dialog';
import { cashCsv, categorySummaryCsv, monthLabel } from '../../lib/documents';
import { exportCsv } from '../../lib/export';
import { formatDate, formatMoney, monthRange, parseMoney } from '../../lib/format';
import { METHOD_LABELS, PAYMENT_LABELS } from '../../lib/types';
import { useFocusData } from '../../lib/useAsync';
import { categoryTone, palette, space } from '../../theme/tokens';

type Kind = 'income' | 'payment' | 'expense';
type View_ = 'list' | 'categories' | 'budget';

type Entry = {
  id: string;
  kind: Kind;
  date: string;
  title: string;
  sub: string;
  amount: number;
  site: string | null;
  icon: IconName;
  tone: { color: string; soft: string };
  remove: () => Promise<void>;
};

const SIGN: Record<Kind, string> = { income: '+', payment: '−', expense: '−' };
const EDIT_ROUTE = { income: '/income/new', expense: '/expense/new', payment: '/payment/new' } as const;

/** Bütçe doluluğuna göre renk: yeşil → turuncu → kırmızı */
const usageColor = (r: number) => (r >= 1 ? palette.negative : r >= 0.8 ? '#E8913A' : palette.positive);

export default function FinanceScreen() {
  const [ym, setYm] = useState(currentYearMonth());
  const [view, setView] = useState<View_>('list');
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [site, setSite] = useState<string>('all');
  const [budgetFor, setBudgetFor] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const toast = useToast();
  const { start, end } = monthRange(ym.year, ym.month);
  const label = monthLabel(ym.year, ym.month);

  const { data, error, loading, reload } = useFocusData(async () => {
    const [incomes, expenses, payments, workers, budgets] = await Promise.all([
      listIncomes(start, end),
      listExpenses(start, end),
      listPayments(start, end),
      listWorkers(),
      listBudgets().catch(() => []), // göç çalıştırılmadıysa bütçesiz devam et
    ]);
    return { incomes, expenses, payments, workers, budgets };
  }, start);

  const workerName = useMemo(() => {
    const m = new Map(data?.workers.map((w) => [w.id, w.full_name]));
    return (id: string) => m.get(id) ?? 'Silinmiş işçi';
  }, [data]);

  const entries = useMemo<Entry[]>(() => {
    if (!data) return [];
    return [
      ...data.incomes.map((i) => {
        const c = incomeCategory(i.category);
        return { id: i.id, kind: 'income' as const, date: i.income_date, title: i.description || c.label, sub: [c.label, i.site, METHOD_LABELS[i.method]].filter(Boolean).join(' · '), amount: i.amount, site: i.site, icon: c.icon, tone: { color: c.color, soft: c.soft }, remove: () => deleteIncome(i.id) };
      }),
      ...data.payments.map((p) => ({
        id: p.id,
        kind: 'payment' as const,
        date: p.pay_date,
        title: workerName(p.worker_id),
        sub: [PAYMENT_LABELS[p.kind], p.note, METHOD_LABELS[p.method]].filter(Boolean).join(' · '),
        amount: p.amount,
        site: null,
        icon: 'user-check' as const,
        tone: categoryTone.payment,
        remove: () => deletePayment(p.id),
      })),
      ...data.expenses.map((e) => {
        const c = expenseCategory(e.category);
        return { id: e.id, kind: 'expense' as const, date: e.expense_date, title: e.description || c.label, sub: [c.label, e.site, METHOD_LABELS[e.method]].filter(Boolean).join(' · '), amount: e.amount, site: e.site, icon: c.icon, tone: { color: c.color, soft: c.soft }, remove: () => deleteExpense(e.id) };
      }),
    ].sort((a, b) => b.date.localeCompare(a.date));
  }, [data, workerName]);

  const sites = useMemo(() => [...new Set(entries.map((e) => e.site).filter((s): s is string => !!s))], [entries]);
  const sum = (k: Kind) => entries.filter((e) => e.kind === k).reduce((t, e) => t + e.amount, 0);
  const income = sum('income');
  const paid = sum('payment');
  const expense = sum('expense');
  const net = income - paid - expense;

  const groups = useMemo(() => {
    const shown = entries.filter((e) => (kind === 'all' || e.kind === kind) && (site === 'all' || e.site === site));
    const m = new Map<string, Entry[]>();
    for (const e of shown) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return [...m.entries()];
  }, [entries, kind, site]);

  const expenseTotals = useMemo(() => categoryTotals(data?.expenses ?? [], data?.budgets ?? []), [data]);
  const incomeTotals = useMemo(() => categoryTotals(data?.incomes ?? []), [data]);
  const siteTotals = useMemo(() => {
    const m = new Map<string, { income: number; expense: number }>();
    for (const e of entries) {
      if (!e.site || e.kind === 'payment') continue;
      const t = m.get(e.site) ?? { income: 0, expense: 0 };
      t[e.kind === 'income' ? 'income' : 'expense'] += e.amount;
      m.set(e.site, t);
    }
    return [...m.entries()].sort((a, b) => b[1].income - b[1].expense - (a[1].income - a[1].expense));
  }, [entries]);
  const budgeted = expenseTotals.filter((t) => t.limit != null);
  const budgetTotal = budgeted.reduce((t, x) => t + (x.limit ?? 0), 0);
  const budgetSpent = budgeted.reduce((t, x) => t + x.total, 0);

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

  async function saveBudget(remove = false) {
    if (!budgetFor) return;
    const v = remove ? null : parseMoney(budgetInput);
    if (!remove && !(v! > 0)) return toast('Geçerli bir tutar girin', 'error');
    try {
      await setBudget(budgetFor, v);
      toast(remove ? 'Bütçe kaldırıldı' : 'Bütçe kaydedildi');
      setBudgetFor(null);
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  }

  const share = (t: number, all: number) => (all > 0 ? Math.round((t / all) * 100) : 0);

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <MonthStepper value={ym} onChange={setYm} />
      <ErrorText>{error}</ErrorText>
      {loading && !data && <Loading />}
      {data && (
        <>
          <Appear>
            <HeroCard label={`${label} · kasa`} amount={net} signed caption="Giren − işçilere verilen − giderler">
              <HeroStats
                items={[
                  { label: 'Giren', value: formatMoney(income), tone: 'positive' },
                  { label: 'İşçilere', value: formatMoney(paid) },
                  { label: 'Gider', value: formatMoney(expense) },
                ]}
              />
            </HeroCard>
          </Appear>

          <Segmented<View_>
            options={[
              { value: 'list', label: 'Hareketler' },
              { value: 'categories', label: 'Dağılım' },
              { value: 'budget', label: 'Bütçe' },
            ]}
            value={view}
            onChange={setView}
          />

          {view === 'list' && (
            <>
              <ChoiceChips<'all' | Kind>
                options={[
                  { value: 'all', label: 'Tümü' },
                  { value: 'income', label: 'Gelir', icon: 'arrow-down-left', ...categoryTone.income },
                  { value: 'expense', label: 'Gider', icon: 'arrow-up-right', ...categoryTone.expense },
                  { value: 'payment', label: 'İşçi', icon: 'user-check', ...categoryTone.payment },
                ]}
                value={kind}
                onChange={setKind}
              />
              {sites.length > 0 && (
                <ChoiceChips
                  options={[{ value: 'all', label: 'Tüm şantiyeler', icon: 'map-pin' as IconName }, ...sites.map((s) => ({ value: s, label: s, icon: 'map-pin' as IconName }))]}
                  value={site}
                  onChange={setSite}
                />
              )}
              {groups.length === 0 ? (
                <EmptyState icon="inbox" title="Kayıt yok" description="Sağ üstteki + ile gelir, gider veya avans ekle." />
              ) : (
                groups.map(([date, items], gi) => (
                  <Appear key={date} index={gi}>
                    <Section label={formatDate(date)} right={<Text variant="caption" tone="tertiary" numeric>{formatMoney(items.reduce((t, e) => t + (e.kind === 'income' ? e.amount : -e.amount), 0))}</Text>}>
                      <ListCard>
                        {items.map((e) => (
                          <ListRow
                            key={e.id}
                            leading={<IconBox icon={e.icon} {...e.tone} />}
                            title={e.title}
                            subtitle={e.sub}
                            value={`${SIGN[e.kind]} ${formatMoney(e.amount)}`}
                            valueTone={e.kind === 'income' ? 'positive' : 'primary'}
                            onPress={() => router.push({ pathname: EDIT_ROUTE[e.kind], params: { id: e.id } })}
                            onLongPress={() => confirmDelete(e)}
                            chevron
                          />
                        ))}
                      </ListCard>
                    </Section>
                  </Appear>
                ))
              )}
              {entries.length > 0 && <Hint>Düzenlemek için kayda dokun, hızlı silmek için basılı tut.</Hint>}
            </>
          )}

          {view === 'categories' && (
            <>
              <Section label={`Giderler · ${formatMoney(expense)}`}>
                {expenseTotals.filter((t) => t.total > 0).length === 0 ? (
                  <Card>
                    <Text variant="caption" tone="tertiary" align="center">
                      Bu ay gider yok
                    </Text>
                  </Card>
                ) : (
                  <Card style={{ gap: space.lg }}>
                    {expenseTotals
                      .filter((t) => t.total > 0)
                      .map((t) => {
                        const c = expenseCategory(t.key);
                        return (
                          <View key={t.key} style={{ gap: space.sm }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                              <IconBox icon={c.icon} color={c.color} soft={c.soft} size={36} />
                              <View style={{ flex: 1 }}>
                                <Text variant="ui">{c.label}</Text>
                                <Text variant="caption" tone="tertiary">
                                  {t.count} kayıt · %{share(t.total, expense)}
                                </Text>
                              </View>
                              <Text variant="ui" weight="semibold" numeric>
                                {formatMoney(t.total)}
                              </Text>
                            </View>
                            <AnimatedBar value={expense ? t.total / expense : 0} color={c.color} track={palette.track} />
                          </View>
                        );
                      })}
                  </Card>
                )}
              </Section>

              <Section label={`Gelirler · ${formatMoney(income)}`}>
                {incomeTotals.length === 0 ? (
                  <Card>
                    <Text variant="caption" tone="tertiary" align="center">
                      Bu ay gelir yok
                    </Text>
                  </Card>
                ) : (
                  <ListCard>
                    {incomeTotals.map((t) => {
                      const c = incomeCategory(t.key);
                      return (
                        <ListRow
                          key={t.key}
                          leading={<IconBox icon={c.icon} color={c.color} soft={c.soft} />}
                          title={c.label}
                          subtitle={`${t.count} kayıt · %${share(t.total, income)}`}
                          value={formatMoney(t.total)}
                          valueTone="positive"
                        />
                      );
                    })}
                  </ListCard>
                )}
              </Section>

              {siteTotals.length > 0 && (
                <Section label="Şantiye bazında">
                  <ListCard>
                    {siteTotals.map(([name, t]) => (
                      <ListRow
                        key={name}
                        leading={<IconBox icon="map-pin" {...categoryTone.worker} />}
                        title={name}
                        subtitle={`+${formatMoney(t.income)} · −${formatMoney(t.expense)}`}
                        value={formatMoney(t.income - t.expense)}
                        valueTone={t.income - t.expense < 0 ? 'negative' : 'positive'}
                        valueSub="net"
                      />
                    ))}
                  </ListCard>
                  <Hint>İşçilik bu tabloya dahil değildir; şantiye seçerek girilen gelir ve giderler gösterilir.</Hint>
                </Section>
              )}
            </>
          )}

          {view === 'budget' && (
            <>
              {budgeted.length > 0 && (
                <Card style={{ gap: space.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View>
                      <Text variant="overline" tone="secondary">
                        Bütçe kullanımı
                      </Text>
                      <Text variant="display" numeric>
                        %{share(budgetSpent, budgetTotal)}
                      </Text>
                    </View>
                    <Text variant="caption" tone="secondary" numeric>
                      {formatMoney(budgetSpent)} / {formatMoney(budgetTotal)}
                    </Text>
                  </View>
                  <AnimatedBar value={budgetTotal ? budgetSpent / budgetTotal : 0} color={usageColor(budgetTotal ? budgetSpent / budgetTotal : 0)} track={palette.track} height={8} />
                </Card>
              )}
              <Section label="Kategori bütçeleri">
                <ListCard>
                  {EXPENSE_CATEGORIES.map((c) => {
                    const t = expenseTotals.find((x) => x.key === c.key);
                    const spent = t?.total ?? 0;
                    const limit = t?.limit ?? null;
                    const ratio = limit ? spent / limit : 0;
                    return (
                      <PressableScale
                        key={c.key}
                        scale={0.99}
                        onPress={() => {
                          setBudgetInput(limit ? String(limit) : '');
                          setBudgetFor(c.key);
                        }}
                        style={{ padding: space.lg, gap: space.sm }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                          <IconBox icon={c.icon} color={c.color} soft={c.soft} size={36} />
                          <View style={{ flex: 1 }}>
                            <Text variant="ui">{c.label}</Text>
                            <Text variant="caption" tone={limit && ratio >= 1 ? 'negative' : 'tertiary'}>
                              {limit ? (ratio >= 1 ? `Bütçe aşıldı: ${formatMoney(spent - limit)}` : `Kalan ${formatMoney(limit - spent)}`) : 'Bütçe yok · ayarlamak için dokun'}
                            </Text>
                          </View>
                          <Text variant="ui" weight="semibold" numeric>
                            {formatMoney(spent)}
                            {limit ? <Text variant="caption" tone="tertiary">{` / ${formatMoney(limit)}`}</Text> : null}
                          </Text>
                        </View>
                        {limit ? <AnimatedBar value={ratio} color={usageColor(ratio)} track={palette.track} /> : null}
                      </PressableScale>
                    );
                  })}
                </ListCard>
              </Section>
            </>
          )}

          <ExportMenu
            label="Muhasebeciye gönder"
            title={`${label} gelir-gider`}
            options={[
              {
                label: 'Excel — tüm hareketler',
                subtitle: 'Tarih, kategori, şantiye, ödeme şekli, tutar',
                icon: 'grid',
                kind: 'excel',
                run: () =>
                  exportCsv(
                    safeFileName(`Gelir-Gider ${label}`),
                    cashCsv(data.incomes, data.payments, data.expenses, workerName, { income: (k) => incomeCategory(k).label, expense: (k) => expenseCategory(k).label }),
                  ),
              },
              {
                label: 'Excel — kategori özeti',
                subtitle: 'Kategori toplamları, bütçeler ve net',
                icon: 'pie-chart',
                kind: 'excel',
                run: () =>
                  exportCsv(
                    safeFileName(`Ozet ${label}`),
                    categorySummaryCsv(
                      `${label} gelir-gider özeti`,
                      incomeTotals.map((t) => ({ label: incomeCategory(t.key).label, total: t.total })),
                      expenseTotals.map((t) => ({ label: expenseCategory(t.key).label, total: t.total, limit: t.limit })),
                      paid,
                    ),
                  ),
              },
            ]}
          />
        </>
      )}

      <Sheet visible={budgetFor !== null} title={budgetFor ? `${expenseCategory(budgetFor).label} bütçesi` : ''} subtitle="Aylık harcama sınırı" onClose={() => setBudgetFor(null)}>
        <Field label="Aylık sınır (₺)" value={budgetInput} onChangeText={setBudgetInput} keyboardType="decimal-pad" autoFocus placeholder="ör. 20000" />
        <Button title="Kaydet" size="lg" onPress={() => saveBudget()} />
        {budgetFor && expenseTotals.find((t) => t.key === budgetFor)?.limit != null && <Button title="Bütçeyi kaldır" variant="danger" onPress={() => saveBudget(true)} />}
      </Sheet>
    </Screen>
  );
}

