import { Pressable, StyleSheet, View } from 'react-native';
import { addDays, fromISODate, MONTHS, toISODate } from '../lib/format';
import { tapFeedback } from '../lib/haptics';
import { palette, radius, space } from '../theme/tokens';
import { IconButton, Text } from './ui';

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/** Seçili tarihin haftasının pazartesisi */
export function weekStart(iso: string): string {
  const d = fromISODate(iso);
  return addDays(iso, -((d.getDay() + 6) % 7));
}

/**
 * Haftalık gün şeridi. Her günün altındaki nokta o günün puantaj durumunu gösterir:
 * dolu yeşil = herkes işaretli, gri = eksik, yok = hiç kayıt yok.
 */
export function WeekStrip({
  value,
  onChange,
  marked,
  total,
}: {
  value: string;
  onChange: (iso: string) => void;
  marked: Record<string, number>;
  total: number;
}) {
  const start = weekStart(value);
  const today = toISODate(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const sel = fromISODate(value);
  const select = (iso: string) => {
    tapFeedback();
    onChange(iso);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <IconButton icon="chevron-left" variant="ghost" onPress={() => select(addDays(value, -7))} accessibilityLabel="Önceki hafta" />
        <Text variant="ui" weight="semibold">
          {MONTHS[sel.getMonth()]} {sel.getFullYear()}
        </Text>
        <IconButton icon="chevron-right" variant="ghost" onPress={() => select(addDays(value, 7))} accessibilityLabel="Sonraki hafta" />
      </View>
      <View style={styles.days}>
        {days.map((iso, i) => {
          const selected = iso === value;
          const isToday = iso === today;
          const count = marked[iso] ?? 0;
          const dot = count === 0 ? null : total > 0 && count >= total ? palette.positive : palette.borderStrong;
          return (
            <Pressable
              key={iso}
              onPress={() => select(iso)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.day, selected && styles.daySelected]}
            >
              <Text variant="caption" color={selected ? palette.textOnDark : palette.textTertiary}>
                {WEEKDAYS[i]}
              </Text>
              <Text variant="title" weight="semibold" color={selected ? palette.textOnDark : isToday ? palette.focus : palette.textPrimary}>
                {fromISODate(iso).getDate()}
              </Text>
              <View style={[styles.dot, { backgroundColor: dot ?? 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
      {value !== today && (
        <Pressable onPress={() => select(today)} style={{ alignSelf: 'center', paddingVertical: space.xs }}>
          <Text variant="caption" tone="link" weight="medium">
            Bugüne dön
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: palette.surface, borderRadius: radius.lg, padding: space.sm, gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  days: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.md, gap: 2 },
  daySelected: { backgroundColor: palette.actionPrimary },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
});
