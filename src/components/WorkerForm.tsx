import { useState } from 'react';
import { Switch, View } from 'react-native';
import type { WorkerInput } from '../lib/api';
import { overtimeRateFor } from '../lib/calc';
import { formatMoney, isValidISODate, parseMoney, toISODate } from '../lib/format';
import { ROLE_LABELS, type WorkerRole } from '../lib/types';
import { palette, space } from '../theme/tokens';
import { Button, Card, ChoiceChips, ErrorText, Field, FormStack, Hint, Section, Text, type IconName } from './ui';

const ROLE_ICONS: Record<WorkerRole, IconName> = { usta: 'award', kalfa: 'tool', duz: 'user', diger: 'more-horizontal' };
const ROLE_TONES: Record<WorkerRole, { color: string; soft: string }> = {
  usta: { color: '#C2186F', soft: 'rgba(255,87,174,0.14)' },
  kalfa: { color: '#2E46C4', soft: 'rgba(79,105,242,0.14)' },
  duz: { color: '#0B6B4A', soft: 'rgba(23,203,141,0.15)' },
  diger: { color: '#616161', soft: 'rgba(115,115,115,0.12)' },
};

export const roleOptions = (Object.keys(ROLE_LABELS) as WorkerRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r], icon: ROLE_ICONS[r], ...ROLE_TONES[r] }));
export const roleTone = (r: WorkerRole) => ({ ...ROLE_TONES[r], ink: ROLE_TONES[r].color });

/** "TR12 0006 ..." biçiminde gruplar */
export const formatIban = (s: string) =>
  s
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim();

export function WorkerForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<WorkerInput>;
  submitLabel: string;
  onSubmit: (input: WorkerInput) => Promise<void>;
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? '');
  const [role, setRole] = useState<WorkerRole>(initial?.role ?? 'duz');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [wage, setWage] = useState(initial?.daily_wage != null ? String(initial.daily_wage) : '');
  const [overtime, setOvertime] = useState(initial?.overtime_rate != null ? String(initial.overtime_rate) : '');
  const [startDate, setStartDate] = useState(initial?.start_date ?? toISODate(new Date()));
  const [iban, setIban] = useState(initial?.iban ?? '');
  const [emergency, setEmergency] = useState(initial?.emergency_contact ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dailyWage = parseMoney(wage);
  const defaultOvertime = dailyWage > 0 ? overtimeRateFor({ daily_wage: dailyWage, overtime_rate: null }) : 0;

  async function submit() {
    const ot = overtime.trim() ? parseMoney(overtime) : null;
    if (!fullName.trim()) return setError('İsim gerekli');
    if (!(dailyWage >= 0)) return setError('Geçerli bir yevmiye girin');
    if (ot !== null && !(ot >= 0)) return setError('Geçerli bir mesai ücreti girin');
    if (!isValidISODate(startDate)) return setError('Başlangıç tarihi YYYY-AA-GG formatında olmalı');
    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
    if (cleanIban && !/^TR\d{24}$/.test(cleanIban)) return setError('IBAN "TR" ile başlayan 26 karakter olmalı');
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        full_name: fullName.trim(),
        role,
        phone: phone.trim() || null,
        daily_wage: dailyWage,
        overtime_rate: ot,
        start_date: startDate,
        iban: cleanIban || null,
        emergency_contact: emergency.trim() || null,
        active,
        notes: notes.trim() || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <>
      <Section label="Kimlik">
        <Card>
          <FormStack>
            <Field label="Ad soyad" value={fullName} onChangeText={setFullName} />
            <View style={{ gap: space.sm }}>
              <Text variant="overline" tone="secondary">
                Görev
              </Text>
              <ChoiceChips options={roleOptions} value={role} onChange={setRole} />
            </View>
            <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05xx xxx xx xx" />
          </FormStack>
        </Card>
      </Section>

      <Section label="Ücret">
        <Card>
          <FormStack>
            <Field label="Günlük yevmiye (₺)" value={wage} onChangeText={setWage} keyboardType="decimal-pad" placeholder="Örn. 1500" />
            {initial?.daily_wage != null && <Hint>Yevmiye değişikliği yalnızca bundan sonra girilecek puantajlara uygulanır.</Hint>}
            <Field
              label="Saatlik mesai ücreti (₺)"
              value={overtime}
              onChangeText={setOvertime}
              keyboardType="decimal-pad"
              placeholder={defaultOvertime ? `Boş bırakılırsa ${formatMoney(defaultOvertime)}` : 'Yevmiye / 8 × 1,5'}
            />
            <Field label="IBAN (ödeme için)" value={iban} onChangeText={(t) => setIban(formatIban(t))} autoCapitalize="characters" placeholder="TR00 0000 0000 0000 0000 0000 00" />
          </FormStack>
        </Card>
      </Section>

      <Section label="Diğer">
        <Card>
          <FormStack>
            <Field label="İşe başlama tarihi" value={startDate} onChangeText={setStartDate} placeholder="YYYY-AA-GG" />
            <Field label="Acil durumda aranacak kişi" value={emergency} onChangeText={setEmergency} placeholder="Ad ve telefon" />
            <Field label="Not" value={notes} onChangeText={setNotes} multiline />
          </FormStack>
        </Card>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Aktif çalışıyor</Text>
            <Text variant="caption" tone="secondary">
              Pasif işçiler puantaj listesinde görünmez
            </Text>
          </View>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: palette.focus, false: palette.track }} thumbColor={palette.surface} />
        </Card>
      </Section>
      <ErrorText>{error}</ErrorText>
      <Button title={submitLabel} size="lg" onPress={submit} loading={busy} disabled={!fullName.trim() || !wage.trim()} />
    </>
  );
}
