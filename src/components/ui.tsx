import Feather from '@expo/vector-icons/Feather';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { addDays, formatDateLong, MONTHS, shiftMonth, toISODate } from '../lib/format';
import { control, fonts, palette, radius, space, type as typeScale, type FontWeight, type TypeVariant } from '../theme/tokens';

export type IconName = ComponentProps<typeof Feather>['name'];

// ───────────────────────── Tipografi ─────────────────────────

const TONES = {
  primary: palette.textPrimary,
  secondary: palette.textSecondary,
  tertiary: palette.textTertiary,
  positive: palette.positive,
  negative: palette.negative,
  inverse: palette.textOnDark,
  link: palette.focus,
  brand: palette.brand,
} as const;
export type Tone = keyof typeof TONES;

export function Text({
  variant = 'body',
  weight,
  tone = 'primary',
  color,
  align,
  style,
  children,
  ...rest
}: {
  variant?: TypeVariant;
  weight?: FontWeight;
  tone?: Tone;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
  numberOfLines?: number;
  onPress?: () => void;
}) {
  const t = typeScale[variant];
  return (
    <RNText
      style={[
        {
          fontFamily: fonts[weight ?? t.weight],
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing,
          color: color ?? TONES[tone],
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    >
      {variant === 'overline' && typeof children === 'string' ? upperTr(children) : children}
    </RNText>
  );
}

/** Türkçe büyük harf: i → İ, ı → I (CSS/JS varsayılanı "I" üretir) */
export function upperTr(s: string): string {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

/** Para tutarı; işarete göre renklenir */
export function moneyTone(n: number): Tone {
  return n < 0 ? 'negative' : n > 0 ? 'positive' : 'primary';
}

// ───────────────────────── Yerleşim ─────────────────────────

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={[styles.screen, { flex: 1 }]}>{children}</View>;
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/** Beyaz, gölgesiz, 16 köşeli yüzey. Ayrımı zemin farkı yapar. */
export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[styles.card, padded && { padding: space.lg }, style]}>{children}</View>;
}

/** BÜYÜK HARF bölüm etiketi + içerik */
export function Section({ label, right, children }: { label: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={[styles.row, { justifyContent: 'space-between', paddingHorizontal: space.xs }]}>
        <Text variant="overline" tone="secondary">
          {label}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginLeft: inset }} />;
}

export function Row({
  label,
  value,
  tone,
  strong,
  hint,
}: {
  label: string;
  value: string;
  tone?: Tone;
  strong?: boolean;
  hint?: string;
}) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', minHeight: 32, gap: space.md }]}>
      <View style={{ flexShrink: 1 }}>
        <Text variant="ui" weight="regular" tone="secondary" numberOfLines={1}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Text variant="ui" weight={strong ? 'semibold' : 'medium'} tone={tone ?? 'primary'}>
        {value}
      </Text>
    </View>
  );
}

/** Büyük rakam + etiket (bakiye, toplam) */
export function Stat({ label, value, tone, caption }: { label: string; value: string; tone?: Tone; caption?: ReactNode }) {
  return (
    <View style={{ gap: space.xxs }}>
      <Text variant="overline" tone="secondary">
        {label}
      </Text>
      <Text variant="display" tone={tone ?? 'primary'}>
        {value}
      </Text>
      {caption ? (
        <Text variant="caption" tone="secondary">
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

// ───────────────────────── Aksiyonlar ─────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand';

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: palette.actionPrimary, fg: palette.textOnDark },
  secondary: { bg: palette.surface, fg: palette.textPrimary, border: palette.border },
  ghost: { bg: 'transparent', fg: palette.textPrimary },
  danger: { bg: palette.negativeSoft, fg: palette.negative },
  brand: { bg: palette.brand, fg: palette.textStrong },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  loading,
  block = true,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
}) {
  // Pasif birincil buton gri görünür; renk yalnızca hazır olduğunda gelir
  const c = disabled ? { bg: palette.disabled, fg: palette.textSecondary } : BUTTON_COLORS[variant];
  const border = !disabled && 'border' in c ? c.border : undefined;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { height: control[size], backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 },
        size === 'sm' && { paddingHorizontal: space.md },
        border && { borderWidth: 1, borderColor: border },
        !block && { alignSelf: 'flex-start' },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={size === 'sm' ? 16 : 18} color={c.fg} />}
          <Text variant="ui" weight="semibold" color={c.fg} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  variant = 'control',
  accessibilityLabel,
}: {
  icon: IconName;
  onPress: () => void;
  variant?: 'control' | 'ghost' | 'brand';
  accessibilityLabel: string;
}) {
  const bg = variant === 'brand' ? palette.brand : variant === 'control' ? palette.control : 'transparent';
  const fg = variant === 'brand' ? palette.textStrong : palette.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? palette.controlActive : bg }]}
    >
      <Feather name={icon} size={18} color={fg} />
    </Pressable>
  );
}

// ───────────────────────── Form ─────────────────────────

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space.xs + 2 }}>
      <Text variant="overline" tone="secondary">
        {label}
      </Text>
      <TextInput
        placeholderTextColor={palette.textTertiary}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[styles.input, props.multiline && styles.inputMultiline, focused && styles.inputFocused, Platform.OS === 'web' && WEB_NO_OUTLINE, style]}
      />
    </View>
  );
}

// Web'de tarayıcının odak çerçevesi yerine kendi odak kenarlığımız görünsün
const WEB_NO_OUTLINE = { outlineWidth: 0 } as unknown as TextStyle;

export function FormStack({ children }: { children: ReactNode }) {
  return <View style={{ gap: space.lg }}>{children}</View>;
}

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: space.xs + 2 }}>
      <Text variant="overline" tone="secondary">
        {label}
      </Text>
      <DateStepper value={value} onChange={onChange} filled />
    </View>
  );
}

function Stepper({
  label,
  sub,
  onPrev,
  onNext,
  onPressLabel,
  filled,
}: {
  label: string;
  sub?: string;
  onPrev: () => void;
  onNext: () => void;
  onPressLabel?: () => void;
  filled?: boolean;
}) {
  // Ekran zemininde beyaz yüzey; kart içinde (form) kontrol dolgusu
  return (
    <View style={[styles.stepper, filled && { backgroundColor: palette.control, borderRadius: radius.sm, height: control.md }]}>
      <IconButton icon="chevron-left" variant="ghost" onPress={onPrev} accessibilityLabel="Önceki" />
      <Pressable style={{ flex: 1, alignItems: 'center' }} onPress={onPressLabel} disabled={!onPressLabel}>
        <Text variant="ui" weight="semibold">
          {label}
        </Text>
        {sub ? (
          <Text variant="caption" tone="link">
            {sub}
          </Text>
        ) : null}
      </Pressable>
      <IconButton icon="chevron-right" variant="ghost" onPress={onNext} accessibilityLabel="Sonraki" />
    </View>
  );
}

export function DateStepper({ value, onChange, filled }: { value: string; onChange: (v: string) => void; filled?: boolean }) {
  const today = toISODate(new Date());
  return (
    <Stepper
      filled={filled}
      label={formatDateLong(value)}
      sub={value !== today ? 'Bugüne dön' : undefined}
      onPrev={() => onChange(addDays(value, -1))}
      onNext={() => onChange(addDays(value, 1))}
      onPressLabel={() => onChange(today)}
    />
  );
}

export type YearMonth = { year: number; month: number };

export function currentYearMonth(): YearMonth {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function MonthStepper({ value, onChange }: { value: YearMonth; onChange: (v: YearMonth) => void }) {
  const now = currentYearMonth();
  const isCurrent = now.year === value.year && now.month === value.month;
  return (
    <Stepper
      label={`${MONTHS[value.month]} ${value.year}`}
      sub={isCurrent ? undefined : 'Bu aya dön'}
      onPrev={() => onChange(shiftMonth(value.year, value.month, -1))}
      onNext={() => onChange(shiftMonth(value.year, value.month, 1))}
      onPressLabel={() => onChange(now)}
    />
  );
}

/**
 * Gri ray üzerinde segmentler. Etkin segment beyazdır; `tone` verilirse
 * referanstaki kategori kalıbıyla (renkli nokta + %15 alfa zemin) gösterilir.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; tone?: { color: string; soft: string; ink: string } }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.track}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: o.tone ? o.tone.soft : palette.surface }]}
          >
            {o.tone && <View style={[styles.dot, { backgroundColor: active ? o.tone.color : palette.borderStrong }]} />}
            <Text variant="ui" weight="semibold" color={active ? (o.tone?.ink ?? palette.textPrimary) : palette.textSecondary} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ───────────────────────── Menü ─────────────────────────

export type MenuItem = { label: string; icon: IconName; color: string; soft: string; onPress: () => void };

/** Alttan açılan oluştur menüsü. Her öğe kendi kategori renginde ikon kutusuyla gösterilir. */
export function ActionMenu({ visible, title, items, onClose }: { visible: boolean; title: string; items: MenuItem[]; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.menu} onPress={() => {}}>
          <Text variant="overline" tone="secondary" style={{ paddingHorizontal: space.md, paddingBottom: space.sm }}>
            {title}
          </Text>
          {items.map((it) => (
            <Pressable
              key={it.label}
              onPress={() => {
                onClose();
                it.onPress();
              }}
              style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: palette.controlActive }]}
            >
              <View style={[styles.iconBox, { backgroundColor: it.soft }]}>
                <Feather name={it.icon} size={18} color={it.color} />
              </View>
              <Text variant="title">{it.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Kategori renginde ikon kutusu */
export function IconBox({ icon, color, soft, size = 40 }: { icon: IconName; color: string; soft: string; size?: number }) {
  return (
    <View style={[styles.iconBox, { width: size, height: size, backgroundColor: soft }]}>
      <Feather name={icon} size={Math.round(size * 0.45)} color={color} />
    </View>
  );
}

// ───────────────────────── Geri bildirim ─────────────────────────

/** Küçük meta etiketi ("Avans", "Pasif") */
export function Chip({ label, tone }: { label: string; tone?: { soft: string; ink: string } }) {
  return (
    <View style={[styles.chip, tone && { backgroundColor: tone.soft, borderColor: 'transparent' }]}>
      <Text variant="caption" weight="medium" color={tone?.ink ?? palette.textSecondary}>
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: IconName; title: string; description?: string; action?: ReactNode }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: space.xxl, gap: space.sm }}>
      <Feather name={icon} size={24} color={palette.textSecondary} />
      <Text variant="heading" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="caption" tone="secondary" align="center">
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: space.sm, alignSelf: 'stretch' }}>{action}</View> : null}
    </Card>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <View style={styles.errorBox}>
      <Feather name="alert-circle" size={16} color={palette.negative} />
      <Text variant="caption" tone="negative" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <Text variant="caption" tone="tertiary" align="center">
      {children}
    </Text>
  );
}

export function Loading() {
  return <ActivityIndicator style={{ marginTop: space.xxl }} color={palette.textPrimary} />;
}

export const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: palette.bgApp },
  screen: { padding: space.lg, gap: space.lg, backgroundColor: palette.bgApp, flexGrow: 1 },
  card: { backgroundColor: palette.surface, borderRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  button: {
    flexDirection: 'row',
    gap: space.sm,
    borderRadius: radius.sm,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: { width: control.sm, height: control.sm, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  input: {
    minHeight: control.md,
    backgroundColor: palette.control,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent', // kenarlık yalnızca odakta görünür
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 16, // iOS'ta 16'nın altı odakta zoom'a yol açar
    color: palette.textPrimary,
  },
  inputMultiline: { minHeight: 88, paddingTop: space.md, textAlignVertical: 'top' },
  inputFocused: { borderColor: palette.focus, backgroundColor: palette.surface },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: control.lg,
    paddingHorizontal: space.xs,
    backgroundColor: palette.surface,
    borderRadius: radius.md,
  },
  track: { flexDirection: 'row', backgroundColor: palette.track, borderRadius: radius.sm, padding: space.xs, gap: space.xs },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: control.sm,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chip: {
    height: 24,
    paddingHorizontal: space.sm,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.control,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(16,16,16,0.35)', justifyContent: 'flex-end', padding: space.sm },
  menu: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    marginBottom: space.xxl,
    borderWidth: 1,
    borderColor: palette.border,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, height: 56, paddingHorizontal: space.sm, borderRadius: radius.sm },
  iconBox: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: palette.negativeSoft,
  },
});
