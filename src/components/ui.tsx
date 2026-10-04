import Feather from '@expo/vector-icons/Feather';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { PressableScale, useCountUp } from './motion';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import { addDays, formatDateLong, formatMoney, MONTHS, shiftMonth, toISODate } from '../lib/format';
import { control, fonts, gradients, motion, palette, radius, space, type as typeScale, type FontWeight, type TypeVariant } from '../theme/tokens';

export type IconName = ComponentProps<typeof Feather>['name'];

// ───────────────────────── Tipografi ─────────────────────────

const TONES = {
  primary: palette.textPrimary,
  secondary: palette.textSecondary,
  tertiary: palette.textTertiary,
  positive: palette.positive,
  negative: palette.negative,
  inverse: palette.textOnDark,
  heroMuted: palette.heroMuted,
  heroPositive: palette.heroPositive,
  heroNegative: palette.heroNegative,
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
  numeric,
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
  /** Rakamlar sabit genişlikte (tutar sütunları hizalı durur) */
  numeric?: boolean;
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
        numeric && { fontVariant: ['tabular-nums'] },
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

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  /** Verilirse aşağı çekerek yenileme açılır */
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  if (!scroll) return <View style={[styles.screen, { flex: 1 }]}>{children}</View>;
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.textSecondary} /> : undefined}
    >
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
      <Text variant="display" tone={tone ?? 'primary'} numeric>
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

/** Küçük KPI kutusu; `KpiRow` içinde yan yana dizilir */
export function Kpi({
  label,
  value,
  tone,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
  /** Renkli küçük ikon kutusu (kategori tonu) */
  icon?: IconName;
  accent?: { color: string; soft: string };
}) {
  return (
    <View style={styles.kpi}>
      {icon && accent ? (
        <View style={[styles.kpiIcon, { backgroundColor: accent.soft }]}>
          <Feather name={icon} size={14} color={accent.color} />
        </View>
      ) : null}
      <Text variant="overline" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title" weight="semibold" tone={tone ?? 'primary'} numberOfLines={1} numeric>
        {value}
      </Text>
      {hint ? (
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Koyu gradyanlı kahraman kart: ekranın ana rakamı. Rakam yeni değere akarak gelir.
 * Altına ince satırlar (`HeroStat`) ve aksiyonlar eklenebilir.
 */
export function HeroCard({
  label,
  amount,
  caption,
  right,
  children,
  signed,
}: {
  label: string;
  amount: number;
  caption?: string;
  right?: ReactNode;
  children?: ReactNode;
  /** Negatif tutarı kırmızı, pozitifi yeşil göster */
  signed?: boolean;
}) {
  const shown = useCountUp(amount);
  const color = signed ? (amount < 0 ? palette.heroNegative : amount > 0 ? palette.heroPositive : palette.heroText) : palette.heroText;
  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroGlow} pointerEvents="none" />
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="overline" tone="heroMuted">
            {label}
          </Text>
          <Text variant="hero" color={color} numeric numberOfLines={1}>
            {formatMoney(Math.round(shown * 100) / 100)}
          </Text>
          {caption ? (
            <Text variant="caption" tone="heroMuted">
              {caption}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </LinearGradient>
  );
}

/** Kahraman kartın altındaki küçük rakamlar */
export function HeroStats({ items }: { items: { label: string; value: string; tone?: 'positive' | 'negative' }[] }) {
  return (
    <View style={styles.heroStats}>
      {items.map((it, i) => (
        <View key={it.label} style={[{ flex: 1, gap: 2 }, i > 0 && { borderLeftWidth: 1, borderLeftColor: palette.heroLine, paddingLeft: space.md }]}>
          <Text variant="caption" tone="heroMuted" numberOfLines={1}>
            {it.label}
          </Text>
          <Text
            variant="ui"
            weight="semibold"
            numeric
            numberOfLines={1}
            color={it.tone === 'positive' ? palette.heroPositive : it.tone === 'negative' ? palette.heroNegative : palette.heroText}
          >
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: space.sm }}>{children}</View>;
}

const AVATAR_TONES = ['#8566DC', '#4F69F2', '#17CB8D', '#00CDC6', '#CC7E80', '#B39581'];

/** Baş harfli yuvarlak; renk isimden türetilir, aynı kişi hep aynı renkte görünür */
export function Avatar({ name, size = 40, muted }: { name: string; size?: number; muted?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('');
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const color = muted ? palette.textTertiary : AVATAR_TONES[hash % AVATAR_TONES.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
      <Text variant="ui" weight="semibold" color={color} style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>
        {upperTr(initials)}
      </Text>
    </View>
  );
}

/** Liste satırı: solda öğe (avatar/ikon), ortada başlık + alt satır, sağda değer */
export function ListRow({
  leading,
  title,
  subtitle,
  value,
  valueTone,
  valueSub,
  onPress,
  onLongPress,
  chevron,
  muted,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  value?: string;
  valueTone?: Tone;
  valueSub?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  muted?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={({ pressed }) => [styles.listRow, pressed && { backgroundColor: palette.controlActive }, muted && { opacity: 0.6 }]}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value !== undefined && (
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text variant="ui" weight="semibold" tone={valueTone ?? 'primary'} numeric>
            {value}
          </Text>
          {valueSub ? (
            <Text variant="caption" tone="tertiary">
              {valueSub}
            </Text>
          ) : null}
        </View>
      )}
      {chevron && <Feather name="chevron-right" size={18} color={palette.textTertiary} />}
    </Pressable>
  );
}

/** Kart içinde ayırıcılı liste */
export function ListCard({ children }: { children: ReactNode[] }) {
  const items = children.filter(Boolean);
  return (
    <Card padded={false}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 && <Divider inset={space.lg} />}
          {child}
        </View>
      ))}
    </Card>
  );
}

/** İnce ilerleme çubuğu (0–1) */
export function Progress({ value, color = palette.positive }: { value: number; color?: string }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.track, overflow: 'hidden' }}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
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

/** Marka gradyanlı "oluştur" butonu (pembe → tuğla turuncusu) */
export function BrandButton({ title, icon = 'plus', onPress }: { title: string; icon?: IconName; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button">
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.button, { height: control.md }]}>
        <Feather name={icon} size={18} color={palette.textStrong} />
        <Text variant="ui" weight="semibold" color={palette.textStrong}>
          {title}
        </Text>
      </LinearGradient>
    </PressableScale>
  );
}

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
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={[
        styles.button,
        { height: control[size], backgroundColor: c.bg },
        size === 'sm' && { paddingHorizontal: space.md },
        border ? { borderWidth: 1, borderColor: border } : null,
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
    </PressableScale>
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
  // Etkin segmentin arkasındaki gösterge yaylı şekilde kayar
  const [width, setWidth] = useState(0);
  const index = options.findIndex((o) => o.value === value);
  const pad = space.xs;
  const segW = width > 0 ? (width - pad * 2 - pad * (options.length - 1)) / options.length : 0;
  const x = useSharedValue(0);
  const active = index >= 0 ? options[index] : null;
  const placed = useRef(false);
  useEffect(() => {
    if (segW <= 0 || index < 0) return;
    const target = index * (segW + pad);
    // İlk yerleşimde zıplamadan konumlan, sonraki değişimlerde kay
    x.set(placed.current ? withSpring(target, motion.spring) : target);
    placed.current = true;
  }, [segW, index, pad, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {segW > 0 && active && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segIndicator,
            { width: segW, left: pad, backgroundColor: active.tone ? active.tone.soft : palette.surface },
            !active.tone && styles.segIndicatorShadow,
            indicator,
          ]}
        />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={styles.segment}
          >
            {o.tone && <View style={[styles.dot, { backgroundColor: on ? o.tone.color : palette.borderStrong }]} />}
            <Text variant="ui" weight="semibold" color={on ? (o.tone?.ink ?? palette.textPrimary) : palette.textSecondary} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ───────────────────────── Menü ─────────────────────────

export type MenuItem = {
  label: string;
  subtitle?: string;
  icon: IconName;
  color: string;
  soft: string;
  onPress: () => void;
  selected?: boolean;
};

/** Alttan açılan menü. Her öğe kendi kategori renginde ikon kutusuyla gösterilir. */
export function ActionMenu({
  visible,
  title,
  items,
  onClose,
  footer,
}: {
  visible: boolean;
  title: string;
  items: MenuItem[];
  onClose: () => void;
  footer?: ReactNode;
}) {
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
              <View style={{ flex: 1 }}>
                <Text variant="title">{it.label}</Text>
                {it.subtitle ? (
                  <Text variant="caption" tone="secondary">
                    {it.subtitle}
                  </Text>
                ) : null}
              </View>
              {it.selected && <Feather name="check" size={18} color={palette.textPrimary} />}
            </Pressable>
          ))}
          {footer}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Alttan açılan boş sayfa; içine form konur */
export function Sheet({ visible, title, subtitle, onClose, children }: { visible: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.menu, { padding: space.lg, gap: space.lg }]} onPress={() => {}}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="heading">{title}</Text>
              {subtitle ? (
                <Text variant="caption" tone="secondary">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <IconButton icon="x" onPress={onClose} accessibilityLabel="Kapat" />
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** − değer + */
export function NumberStepper({ value, onChange, step = 1, min = 0, max = 24, unit }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string }) {
  const fmt = (n: number) => String(n).replace('.', ',');
  return (
    <View style={[styles.stepper, { backgroundColor: palette.control, borderRadius: radius.md }]}>
      <IconButton icon="minus" variant="ghost" onPress={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))} accessibilityLabel="Azalt" />
      <Text variant="display" align="center" style={{ flex: 1 }} numeric>
        {fmt(value)}
        {unit ? <Text variant="ui" tone="secondary">{` ${unit}`}</Text> : null}
      </Text>
      <IconButton icon="plus" variant="ghost" onPress={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))} accessibilityLabel="Artır" />
    </View>
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

/** Hızlı seçim çipleri (ör. tutar önerileri) */
export function QuickChips({ options, onSelect }: { options: { label: string; value: string }[]; onSelect: (v: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((o) => (
        <Pressable
          key={o.label}
          onPress={() => onSelect(o.value)}
          style={({ pressed }) => [styles.quickChip, pressed && { backgroundColor: palette.controlActive }]}
        >
          <Text variant="caption" weight="medium">
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Tek seçimli çipler; seçili olan kendi renginde dolar */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName; color?: string; soft?: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      {options.map((o) => {
        const on = o.value === value;
        const color = o.color ?? palette.textPrimary;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[
              styles.choice,
              on && { backgroundColor: o.soft ?? palette.surface, borderColor: o.color ?? palette.textPrimary },
            ]}
          >
            {o.icon && <Feather name={o.icon} size={15} color={on ? color : palette.textSecondary} />}
            <Text variant="caption" weight={on ? 'semibold' : 'medium'} color={on ? color : palette.textPrimary}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Feather name="search" size={16} color={palette.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textTertiary}
        style={[{ flex: 1, fontFamily: fonts.regular, fontSize: 16, color: palette.textPrimary, height: '100%' }, Platform.OS === 'web' && WEB_NO_OUTLINE]}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
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
  // Geniş ekranlarda (web, tablet) içerik ortada telefon genişliğinde kalır
  screen: { padding: space.lg, gap: space.lg, backgroundColor: palette.bgApp, flexGrow: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
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
  kpi: { flex: 1, backgroundColor: palette.surface, borderRadius: radius.lg, padding: space.md, gap: 2 },
  kpiIcon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  hero: { borderRadius: radius.lg + 4, padding: space.xl, gap: space.lg, overflow: 'hidden' },
  heroGlow: {
    position: 'absolute',
    right: -60,
    top: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,87,174,0.16)',
  },
  heroStats: { flexDirection: 'row', gap: space.md, borderTopWidth: 1, borderTopColor: palette.heroLine, paddingTop: space.md },
  segIndicator: { position: 'absolute', top: space.xs, bottom: space.xs, borderRadius: 6 },
  segIndicatorShadow: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 64 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: palette.control,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  quickChip: {
    height: 32,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: palette.control,
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: control.md,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: palette.surface,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sm,
    backgroundColor: palette.negativeSoft,
  },
});
