import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { addDays, formatDateLong, MONTHS, shiftMonth, toISODate } from '../lib/format';

export const colors = {
  bg: '#F4F5F7',
  card: '#FFFFFF',
  text: '#1C1F23',
  muted: '#6B7280',
  border: '#E3E5E8',
  primary: '#D9622B', // tuğla turuncusu
  primaryText: '#FFFFFF',
  green: '#1F8A4C',
  red: '#C62828',
  amber: '#B7791F',
  blue: '#2563EB',
};

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={styles.screen}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  const bg = variant === 'primary' ? colors.primary : variant === 'danger' ? colors.red : colors.card;
  const fg = variant === 'secondary' ? colors.text : colors.primaryText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }, small && { fontSize: 14 }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
    </View>
  );
}

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <DateStepper value={value} onChange={onChange} />
    </View>
  );
}

export function DateStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = toISODate(new Date());
  return (
    <View style={styles.row}>
      <Pressable style={styles.stepBtn} onPress={() => onChange(addDays(value, -1))}>
        <Text style={styles.stepText}>◀</Text>
      </Pressable>
      <Pressable style={{ flex: 1, alignItems: 'center' }} onPress={() => onChange(today)}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{formatDateLong(value)}</Text>
        {value !== today && <Text style={{ fontSize: 12, color: colors.blue }}>Bugüne dön</Text>}
      </Pressable>
      <Pressable style={styles.stepBtn} onPress={() => onChange(addDays(value, 1))}>
        <Text style={styles.stepText}>▶</Text>
      </Pressable>
    </View>
  );
}

export type YearMonth = { year: number; month: number };

export function currentYearMonth(): YearMonth {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function MonthStepper({ value, onChange }: { value: YearMonth; onChange: (v: YearMonth) => void }) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.stepBtn} onPress={() => onChange(shiftMonth(value.year, value.month, -1))}>
        <Text style={styles.stepText}>◀</Text>
      </Pressable>
      <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.text }}>
        {MONTHS[value.month]} {value.year}
      </Text>
      <Pressable style={styles.stepBtn} onPress={() => onChange(shiftMonth(value.year, value.month, 1))}>
        <Text style={styles.stepText}>▶</Text>
      </Pressable>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={[styles.row, { gap: 6 }]}>
      {options.map((o) => {
        const active = o.value === value;
        const c = o.color ?? colors.primary;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segment, { borderColor: active ? c : colors.border, backgroundColor: active ? c : colors.card }]}
          >
            <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', paddingVertical: 4 }]}>
      <Text style={{ color: colors.muted, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: color ?? colors.text, fontSize: 15, fontWeight: bold ? '700' : '500' }}>{value}</Text>
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <Text style={{ color: colors.red, marginVertical: 8 }}>{children}</Text>;
}

export function Loading() {
  return <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />;
}

export const styles = StyleSheet.create({
  screen: { padding: 16, gap: 12, backgroundColor: colors.bg, flexGrow: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  h1: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
  muted: { color: colors.muted, fontSize: 14 },
  button: { borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 12 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, color: colors.muted, marginBottom: 4, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: { padding: 12, backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  stepText: { fontSize: 16, color: colors.text },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
});
