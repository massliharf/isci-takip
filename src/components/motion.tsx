import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { motion } from '../theme/tokens';

/** İçerik aşağıdan yükselerek görünür; `index` ile sıralı (stagger) gelir */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.duration(motion.base).delay(Math.min(index, 8) * motion.stagger).springify().damping(motion.spring.damping)} style={style}>
      {children}
    </Animated.View>
  );
}

const APressable = Animated.createAnimatedComponent(Pressable);

/** Basınca yaylı şekilde hafifçe küçülen dokunma alanı */
export function PressableScale({ style, children, scale = motion.pressScale, ...props }: PressableProps & { style?: StyleProp<ViewStyle>; scale?: number; children: ReactNode }) {
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      {...props}
      onPressIn={(e) => {
        s.set(withSpring(scale, motion.spring));
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withSpring(1, motion.spring));
        props.onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </APressable>
  );
}

/** Sayının yeni değere akarak gelmesi (ana rakamlar için) */
export function useCountUp(value: number, duration: number = motion.slow): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const t0 = Date.now();
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);
  return shown;
}

/** Genişliği yaylı şekilde değişen ilerleme çubuğu */
export function AnimatedBar({ value, color, track, height = 6 }: { value: number; color: string; track: string; height?: number }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withTiming(Math.min(1, Math.max(0, value)), { duration: motion.slow }));
  }, [value, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color }, style]} />
    </Animated.View>
  );
}
