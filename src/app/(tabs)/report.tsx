import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ExportMenu } from '../../components/ExportMenu';
import {
  Avatar,
  Card,
  HeroCard,
  HeroStats,
  IconBox,
  Text,
  currentYearMonth,
  EmptyState,
  ErrorText,
  Kpi,
  KpiRow,
  ListCard,
  ListRow,
  Loading,
  moneyTone,
  MonthStepper,
  Screen,
  Section,
} from '../../components/ui';
import { FAR_FUTURE, listAttendance, listExpenses, listIncomes, listPayments, listWorkerBalances, listWorkers } from '../../lib/api';
import { useBusinessName } from '../../lib/auth';
import { buildMonthReport, categoryTotals, openingBalances, puantajGrid } from '../../lib/calc';
import { expenseCategory } from '../../lib/categories';
import { AnimatedBar, Appear } from '../../components/motion';
import { safeFileName } from '../../lib/csv';
import { monthLabel, monthReportCsv, monthReportHtml, puantajGridCsv, puantajGridHtml } from '../../lib/documents';
import { exportCsv, exportPdf } from '../../lib/export';
import { formatMoney, formatNumber, fromISODate, monthRange } from '../../lib/format';
import { useFocusData } from '../../lib/useAsync';
import { categoryTone, palette, space } from '../../theme/tokens';

export default function SummaryScreen() {
  const [ym, setYm] = useState(currentYearMonth());
  const business = useBusinessName();
  const { start, end } = monthRange(ym.year, ym.month);
  const label = monthLabel(ym.year, ym.month);
  const daysInMonth = fromISODate(end).getDate();

  const { data, error, loading, reload } = useFocusData(async () => {
    // Ay başından bugüne hareketler: hem bu ayı hem de devreden bakiyeyi hesaplamaya yeter
    const [workers, attendanceSince, paymentsSince, incomes, expenses, balances] = await Promise.all([
      listWorkers(),
      listAttendance(start, FAR_FUTURE),
      listPayments(start, FAR_FUTURE),
      listIncomes(start, end),
      listExpenses(start, end),
      listWorkerBalances(),
    ]);
    const attendance = attendanceSince.filter((a) => a.work_date <= end);
    const payments = paymentsSince.filter((p) => p.pay_date <= end);
    const openings = openingBalances(balances, attendanceSince, paymentsSince);
    return {
      workers,
      report: buildMonthReport(workers, attendance, payments, incomes, expenses, openings),
      grid: puantajGrid(workers, attendance, daysInMonth),
      topExpenses: categoryTotals(expenses).slice(0, 4),
    };
  }, start);

  const report = data?.report;
  const totalDays = report?.workers.reduce((t, w) => t + w.workedDays, 0) ?? 0;
  const totalOt = report?.workers.reduce((t, w) => t + w.overtimeHours, 0) ?? 0;
  // En az bir işçinin çalıştığı gün sayısı
  const workingDays = data ? new Set(data.grid.flatMap((r) => r.cells.flatMap((c, i) => (c === 'full' || c === 'half' ? [i] : [])))).size : 0;

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <MonthStepper value={ym} onChange={setYm} />
      <ErrorText>{error}</ErrorText>
      {loading && !data && <Loading />}
      {report && data && (
        <>
          <Appear>
            <HeroCard label={`${label} · net kalan`} amount={report.net} signed caption="Gelir − işçilik (yevmiye + mesai) − diğer giderler">
              <HeroStats
                items={[
                  { label: 'Gelir', value: formatMoney(report.totalIncome), tone: 'positive' },
                  { label: 'İşçilik', value: formatMoney(report.totalLabor) },
                  { label: 'Diğer gider', value: formatMoney(report.totalOtherExpense) },
                ]}
              />
            </HeroCard>
          </Appear>

          {data.topExpenses.length > 0 && (
            <Section label="En çok harcanan">
              <Card style={{ gap: space.md }}>
                {data.topExpenses.map((t) => {
                  const c = expenseCategory(t.key);
                  return (
                    <View key={t.key} style={{ gap: space.xs }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                        <IconBox icon={c.icon} color={c.color} soft={c.soft} size={28} />
                        <Text variant="ui" style={{ flex: 1 }}>
                          {c.label}
                        </Text>
                        <Text variant="ui" weight="semibold" numeric>
                          {formatMoney(t.total)}
                        </Text>
                      </View>
                      <AnimatedBar value={report.totalOtherExpense ? t.total / report.totalOtherExpense : 0} color={c.color} track={palette.track} />
                    </View>
                  );
                })}
              </Card>
            </Section>
          )}

          <Section label="İşçi hesabı">
            <KpiRow>
              <Kpi icon="corner-down-right" accent={categoryTone.worker} label="Devreden" value={formatMoney(report.totalOpening)} hint="Ay başı işçi bakiyesi" />
              <Kpi icon="flag" accent={categoryTone.expense} label="Ay sonu" value={formatMoney(report.totalClosing)} hint={report.totalClosing < 0 ? 'İşçilerden alacak' : 'İşçilere ödenecek'} />
            </KpiRow>
            <KpiRow>
              <Kpi icon="arrow-up-right" accent={categoryTone.payment} label="Verilen" value={formatMoney(report.totalPaid)} hint="Avans + ödeme" />
              <Kpi icon="credit-card" accent={categoryTone.income} label="Kasa net" value={formatMoney(report.cashNet)} tone={moneyTone(report.cashNet)} hint="Gelir − verilen − gider" />
            </KpiRow>
          </Section>

          <Section label="Puantaj">
            <KpiRow>
              <Kpi icon="users" accent={categoryTone.worker} label="Toplam iş günü" value={formatNumber(totalDays)} hint={`${report.workers.filter((w) => w.workedDays > 0).length} işçi`} />
              <Kpi icon="clock" accent={{ color: '#C25A12', soft: 'rgba(255,138,61,0.14)' }} label="Mesai" value={`${formatNumber(totalOt)} saat`} hint={workingDays > 0 ? `${workingDays} iş günü` : '—'} />
            </KpiRow>
          </Section>

          <Section label="İşçi bazında">
            {report.workers.length === 0 ? (
              <EmptyState icon="calendar" title="Bu ay kayıt yok" description="Puantaj veya ödeme girildiğinde burada görünür." />
            ) : (
              <ListCard>
                {report.workers.map((w) => (
                  <ListRow
                    key={w.workerId}
                    leading={<Avatar name={w.name} />}
                    title={w.name}
                    subtitle={`${formatNumber(w.workedDays)} gün · hak edilen ${formatMoney(w.earned)}`}
                    value={formatMoney(w.closing)}
                    valueTone={moneyTone(w.closing)}
                    valueSub={`verilen ${formatMoney(w.paid)}`}
                    onPress={() => router.push(`/worker/${w.workerId}`)}
                    chevron
                  />
                ))}
              </ListCard>
            )}
          </Section>

          <ExportMenu
            label="Raporu dışa aktar"
            title={`${label} raporu`}
            options={[
              {
                label: 'PDF — aylık rapor',
                subtitle: 'Gelir-gider özeti ve işçi bazında hesap',
                icon: 'file-text',
                kind: 'pdf',
                run: () => exportPdf(safeFileName(`Rapor ${label}`), monthReportHtml(`${label} raporu`, business, report)),
              },
              {
                label: 'PDF — puantaj cetveli',
                subtitle: 'İşçi × gün tablosu (yatay sayfa)',
                icon: 'calendar',
                kind: 'pdf',
                run: () => exportPdf(safeFileName(`Puantaj ${label}`), puantajGridHtml(`${label} puantaj cetveli`, business, data.grid, ym.year, ym.month, daysInMonth)),
              },
              {
                label: 'Excel — puantaj cetveli',
                subtitle: 'Her gün bir sütun: T / Y / İ / X',
                icon: 'grid',
                kind: 'excel',
                run: () => exportCsv(safeFileName(`Puantaj ${label}`), puantajGridCsv(data.grid, daysInMonth)),
              },
              {
                label: 'Excel — aylık rapor',
                subtitle: 'İşçi bazında gün, avans, ödeme ve bakiye',
                icon: 'list',
                kind: 'excel',
                run: () => exportCsv(safeFileName(`Rapor ${label}`), monthReportCsv(report)),
              },
            ]}
          />
        </>
      )}
    </Screen>
  );
}
