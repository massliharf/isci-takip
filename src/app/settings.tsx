import Constants from 'expo-constants';
import { useState } from 'react';
import { View } from 'react-native';
import { ExportMenu } from '../components/ExportMenu';
import { useToast } from '../components/Toast';
import { Avatar, Button, Card, ErrorText, Field, FormStack, Hint, Screen, Section, Text } from '../components/ui';
import { FAR_FUTURE, FAR_PAST, listAttendance, listExpenses, listIncomes, listPayments, listWorkers, updateProfile } from '../lib/api';
import { useAuth } from '../lib/auth';
import { confirmAction, errorMessage } from '../lib/dialog';
import { exportCsv, exportJson } from '../lib/export';
import { formatDate, toISODate } from '../lib/format';
import { successFeedback } from '../lib/haptics';
import { supabase } from '../lib/supabase';
import { PAYMENT_LABELS, STATUS_LABELS } from '../lib/types';
import { space } from '../theme/tokens';

async function loadEverything() {
  const [workers, attendance, payments, incomes, expenses] = await Promise.all([
    listWorkers(),
    listAttendance(FAR_PAST, FAR_FUTURE),
    listPayments(),
    listIncomes(),
    listExpenses(),
  ]);
  return { workers, attendance, payments, incomes, expenses };
}

export default function SettingsScreen() {
  const { session } = useAuth();
  const meta = session?.user.user_metadata ?? {};
  const [fullName, setFullName] = useState(String(meta.full_name ?? ''));
  const [business, setBusiness] = useState(String(meta.business_name ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const dirty = fullName !== String(meta.full_name ?? '') || business !== String(meta.business_name ?? '');
  const stamp = toISODate(new Date());

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateProfile({ full_name: fullName.trim(), business_name: business.trim() });
      successFeedback();
      toast('Bilgiler kaydedildi');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Avatar name={fullName || session?.user.email || '?'} size={48} />
        <View style={{ flex: 1 }}>
          <Text variant="title">{fullName || 'Kullanıcı'}</Text>
          <Text variant="caption" tone="secondary">
            {session?.user.email}
          </Text>
        </View>
      </Card>

      <Section label="İşletme bilgileri">
        <Card>
          <FormStack>
            <Field label="Ad soyad" value={fullName} onChangeText={setFullName} />
            <Field label="İşletme / firma adı" value={business} onChangeText={setBusiness} placeholder="Raporların başlığında görünür" />
            <ErrorText>{error}</ErrorText>
            <Button title="Kaydet" onPress={save} loading={busy} disabled={!dirty} />
          </FormStack>
        </Card>
      </Section>

      <Section label="Verilerim">
        <ExportMenu
          label="Tüm verileri dışa aktar"
          title="Yedek"
          options={[
            {
              label: 'Excel — tüm puantaj',
              subtitle: 'Bütün işçilerin gün gün kayıtları',
              icon: 'calendar',
              kind: 'excel',
              run: async () => {
                const d = await loadEverything();
                const name = new Map(d.workers.map((w) => [w.id, w.full_name]));
                await exportCsv(`puantaj-${stamp}`, [
                  ['Tarih', 'İşçi', 'Durum', 'Yevmiye'],
                  ...d.attendance.map((a) => [formatDate(a.work_date), name.get(a.worker_id) ?? '', STATUS_LABELS[a.status], a.daily_wage]),
                ]);
              },
            },
            {
              label: 'Excel — tüm ödemeler',
              subtitle: 'Bütün avans ve ödemeler',
              icon: 'user-check',
              kind: 'excel',
              run: async () => {
                const d = await loadEverything();
                const name = new Map(d.workers.map((w) => [w.id, w.full_name]));
                await exportCsv(`odemeler-${stamp}`, [
                  ['Tarih', 'İşçi', 'Tür', 'Tutar', 'Not'],
                  ...d.payments.map((p) => [formatDate(p.pay_date), name.get(p.worker_id) ?? '', PAYMENT_LABELS[p.kind], p.amount, p.note ?? '']),
                ]);
              },
            },
            {
              label: 'Tam yedek (JSON)',
              subtitle: 'Tüm kayıtlar, saklamak için',
              icon: 'database',
              kind: 'data',
              run: async () => exportJson(`isci-takip-yedek-${stamp}`, { exportedAt: new Date().toISOString(), ...(await loadEverything()) }),
            },
          ]}
        />
        <Hint>{"Verilerin Supabase'de güvenle saklanır. Yedek, ek bir kopya almak içindir."}</Hint>
      </Section>

      <Button
        title="Çıkış yap"
        icon="log-out"
        variant="danger"
        onPress={() =>
          confirmAction({
            title: 'Çıkış',
            message: 'Hesabınızdan çıkış yapılsın mı?',
            confirmText: 'Çıkış yap',
            onConfirm: () => supabase.auth.signOut().then(() => undefined),
          })
        }
      />
      <Text variant="caption" tone="tertiary" align="center">
        İşçi Takip · sürüm {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </Screen>
  );
}
