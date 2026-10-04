import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import {
  Button,
  Card,
  currentYearMonth,
  Divider,
  EmptyState,
  ErrorText,
  Loading,
  moneyTone,
  MonthStepper,
  Row,
  Screen,
  Section,
  Stat,
  Text,
} from '../../components/ui';
import { listAttendance, listExpenses, listIncomes, listPayments, listWorkers } from '../../lib/api';
import { buildMonthReport } from '../../lib/calc';
import { formatMoney, MONTHS, monthRange } from '../../lib/format';
import { buildReportHtml } from '../../lib/reportHtml';
import { supabase } from '../../lib/supabase';
import { errorMessage, showMessage } from '../../lib/dialog';
import { useFocusData } from '../../lib/useAsync';
import { space } from '../../theme/tokens';

export default function ReportScreen() {
  const [ym, setYm] = useState(currentYearMonth());
  const [sharing, setSharing] = useState(false);
  const { start, end } = monthRange(ym.year, ym.month);
  const title = `${MONTHS[ym.month]} ${ym.year} Raporu`;

  const { data: report, error, loading } = useFocusData(async () => {
    const [workers, attendance, payments, incomes, expenses] = await Promise.all([
      listWorkers(),
      listAttendance(start, end),
      listPayments(start, end),
      listIncomes(start, end),
      listExpenses(start, end),
    ]);
    return buildMonthReport(workers, attendance, payments, incomes, expenses);
  }, start);

  async function share() {
    if (!report) return;
    setSharing(true);
    try {
      const { data } = await supabase.auth.getUser();
      const business = String(data.user?.user_metadata?.business_name ?? '');
      const html = buildReportHtml(title, business, report);
      if (Platform.OS === 'web') {
        // Web'de expo-print yalnızca mevcut sayfayı yazdırır; raporu yeni sekmede açıp yazdır (PDF olarak kaydet)
        const w = window.open('', '_blank');
        if (!w) return showMessage('Pencere açılamadı', 'Tarayıcının açılır pencere engelini kapatıp tekrar deneyin.');
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title });
      else showMessage('PDF oluşturuldu', uri);
    } catch (e) {
      showMessage('PDF oluşturulamadı', errorMessage(e));
    } finally {
      setSharing(false);
    }
  }

  return (
    <Screen>
      <MonthStepper value={ym} onChange={setYm} />
      <ErrorText>{error}</ErrorText>
      {loading && !report && <Loading />}
      {report && (
        <>
          <Card style={{ gap: space.md }}>
            <Stat label="Net kalan" value={formatMoney(report.net)} tone={moneyTone(report.net)} caption="Gelir − işçilik − diğer giderler" />
            <Divider />
            <View style={{ gap: space.xs }}>
              <Row label="Toplam gelir" value={formatMoney(report.totalIncome)} tone="positive" />
              <Row label="İşçilik gideri" value={`− ${formatMoney(report.totalLabor)}`} />
              <Row label="Diğer giderler" value={`− ${formatMoney(report.totalOtherExpense)}`} />
            </View>
          </Card>
          <Card style={{ gap: space.xs }}>
            <Row label="İşçilere fiilen verilen" value={formatMoney(report.totalPaid)} hint="Bu ayki avans + ödemeler" />
            <Row label="Kasa net" value={formatMoney(report.cashNet)} tone={moneyTone(report.cashNet)} strong hint="Gelir − verilen − giderler" />
          </Card>

          <Section label="İşçi bazında">
            {report.workers.length === 0 ? (
              <EmptyState icon="calendar" title="Bu ay kayıt yok" description="Puantaj veya ödeme girildiğinde burada görünür." />
            ) : (
              <Card padded={false}>
                {report.workers.map((w, i) => (
                  <View key={w.workerId}>
                    {i > 0 && <Divider inset={space.lg} />}
                    <View style={{ padding: space.lg, gap: space.xs }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Text variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {w.name}
                        </Text>
                        <Text variant="ui" weight="semibold" tone={moneyTone(w.balance)}>
                          {formatMoney(w.balance)}
                        </Text>
                      </View>
                      <Text variant="caption" tone="secondary">
                        {w.fullDays} tam · {w.halfDays} yarım · {w.leaveDays} izinli · {w.absentDays} gelmedi
                      </Text>
                      <Text variant="caption" tone="tertiary">
                        Hak edilen {formatMoney(w.earned)} · verilen {formatMoney(w.paid)}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </Section>
          <Button title={Platform.OS === 'web' ? 'Yazdır / PDF kaydet' : 'PDF olarak paylaş'} icon="share" size="lg" onPress={share} loading={sharing} />
        </>
      )}
    </Screen>
  );
}
