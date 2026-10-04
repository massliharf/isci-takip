import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Card, colors, currentYearMonth, ErrorText, H1, Loading, MonthStepper, Muted, Row, Screen } from '../../components/ui';
import { listAttendance, listExpenses, listIncomes, listPayments, listWorkers } from '../../lib/api';
import { buildMonthReport } from '../../lib/calc';
import { formatMoney, MONTHS, monthRange } from '../../lib/format';
import { buildReportHtml } from '../../lib/reportHtml';
import { supabase } from '../../lib/supabase';
import { useFocusData } from '../../lib/useAsync';

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
  }, [start]);

  async function share() {
    if (!report) return;
    setSharing(true);
    try {
      const { data } = await supabase.auth.getUser();
      const business = String(data.user?.user_metadata?.business_name ?? '');
      const { uri } = await Print.printToFileAsync({ html: buildReportHtml(title, business, report) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title });
      else Alert.alert('PDF oluşturuldu', uri);
    } catch (e) {
      Alert.alert('PDF oluşturulamadı', e instanceof Error ? e.message : String(e));
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
          <Card>
            <H1>Ay özeti</H1>
            <Row label="Toplam gelir" value={formatMoney(report.totalIncome)} color={colors.green} />
            <Row label="İşçilik gideri" value={formatMoney(report.totalLabor)} color={colors.red} />
            <Row label="Diğer giderler" value={formatMoney(report.totalOtherExpense)} color={colors.red} />
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 6 }} />
            <Row label="Net kalan" value={formatMoney(report.net)} color={report.net >= 0 ? colors.green : colors.red} bold />
            <View style={{ height: 8 }} />
            <Muted>Kasa bazlı: işçilere bu ay fiilen verilen {formatMoney(report.totalPaid)} → kasa net {formatMoney(report.cashNet)}</Muted>
          </Card>
          <Card>
            <H1>İşçi bazında</H1>
            {report.workers.length === 0 && <Muted>Bu ay kayıt yok.</Muted>}
            {report.workers.map((w) => (
              <View key={w.workerId} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ fontWeight: '700', fontSize: 15 }}>{w.name}</Text>
                <Muted>
                  {w.fullDays} tam · {w.halfDays} yarım · {w.leaveDays} izinli · {w.absentDays} gelmedi
                </Muted>
                <Row label="Hak edilen" value={formatMoney(w.earned)} />
                <Row label="Verilen (avans+ödeme)" value={formatMoney(w.paid)} />
                <Row label="Ay farkı" value={formatMoney(w.balance)} color={w.balance >= 0 ? colors.green : colors.red} bold />
              </View>
            ))}
          </Card>
          <Button title="PDF olarak paylaş" onPress={share} loading={sharing} />
        </>
      )}
    </Screen>
  );
}
