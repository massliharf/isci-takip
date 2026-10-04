import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ExportMenu } from '../../components/ExportMenu';
import {
  Avatar,
  Card,
  currentYearMonth,
  Divider,
  EmptyState,
  ErrorText,
  Kpi,
  KpiRow,
  ListCard,
  ListRow,
  Loading,
  moneyTone,
  MonthStepper,
  Row,
  Screen,
  Section,
  Stat,
} from '../../components/ui';
import { FAR_FUTURE, listAttendance, listExpenses, listIncomes, listPayments, listWorkerBalances, listWorkers } from '../../lib/api';
import { useBusinessName } from '../../lib/auth';
import { buildMonthReport, openingBalances, puantajGrid } from '../../lib/calc';
import { safeFileName } from '../../lib/csv';
import { monthLabel, monthReportCsv, monthReportHtml, puantajGridCsv, puantajGridHtml } from '../../lib/documents';
import { exportCsv, exportPdf } from '../../lib/export';
import { formatMoney, formatNumber, fromISODate, monthRange } from '../../lib/format';
import { useFocusData } from '../../lib/useAsync';
import { space } from '../../theme/tokens';

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
    };
  }, start);

  const report = data?.report;
  const totalDays = report?.workers.reduce((t, w) => t + w.workedDays, 0) ?? 0;
  // En az bir işçinin çalıştığı gün sayısı
  const workingDays = data ? new Set(data.grid.flatMap((r) => r.cells.flatMap((c, i) => (c === 'full' || c === 'half' ? [i] : [])))).size : 0;

  return (
    <Screen onRefresh={reload} refreshing={loading && !!data}>
      <MonthStepper value={ym} onChange={setYm} />
      <ErrorText>{error}</ErrorText>
      {loading && !data && <Loading />}
      {report && data && (
        <>
          <Card style={{ gap: space.md }}>
            <Stat label="Net kalan" value={formatMoney(report.net)} tone={moneyTone(report.net)} caption="Gelir − işçilik − diğer giderler" />
            <Divider />
            <View style={{ gap: space.xs }}>
              <Row label="Gelir" value={`+ ${formatMoney(report.totalIncome)}`} tone="positive" />
              <Row label="İşçilik (hak edilen yevmiye)" value={`− ${formatMoney(report.totalLabor)}`} />
              <Row label="Diğer giderler" value={`− ${formatMoney(report.totalOtherExpense)}`} />
            </View>
          </Card>

          <Section label="İşçi hesabı">
            <KpiRow>
              <Kpi label="Devreden" value={formatMoney(report.totalOpening)} hint="Ay başı işçi bakiyesi" />
              <Kpi label="Ay sonu" value={formatMoney(report.totalClosing)} hint={report.totalClosing < 0 ? 'İşçilerden alacak' : 'İşçilere ödenecek'} />
            </KpiRow>
            <KpiRow>
              <Kpi label="Verilen" value={formatMoney(report.totalPaid)} hint="Avans + ödeme" />
              <Kpi label="Kasa net" value={formatMoney(report.cashNet)} tone={moneyTone(report.cashNet)} hint="Gelir − verilen − gider" />
            </KpiRow>
          </Section>

          <Section label="Puantaj">
            <KpiRow>
              <Kpi label="Toplam iş günü" value={formatNumber(totalDays)} hint={`${report.workers.filter((w) => w.workedDays > 0).length} işçi`} />
              <Kpi label="Çalışılan gün" value={String(workingDays)} hint={workingDays > 0 ? `Günlük ort. ${formatMoney(report.totalLabor / workingDays)}` : '—'} />
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
