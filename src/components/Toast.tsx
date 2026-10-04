import Feather from '@expo/vector-icons/Feather';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, space } from '../theme/tokens';
import { Text } from './ui';

type ToastKind = 'success' | 'error';
type ToastState = { id: number; message: string; kind: ToastKind } | null;

const ToastContext = createContext<(message: string, kind?: ToastKind) => void>(() => {});

/** Kısa süreli alt bildirim ("Kaydedildi"). Ekranı engellemez. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, kind: ToastKind = 'success') => setToast({ id: Date.now(), message, kind }), []);

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
    }, 2200);
    return () => clearTimeout(t);
  }, [toast, opacity]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: insets.bottom + 88 }]}>
          <Animated.View style={[styles.toast, { opacity }]}>
            <Feather name={toast.kind === 'success' ? 'check-circle' : 'alert-circle'} size={16} color={toast.kind === 'success' ? '#5EE0B0' : '#FF8A8E'} />
            <Text variant="ui" color={palette.textOnDark}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: palette.actionPrimary,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.pill,
    maxWidth: '90%',
  },
});
