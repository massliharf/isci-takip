import { Alert, Platform } from 'react-native';

// react-native-web'de Alert.alert hiçbir şey yapmaz; web'de tarayıcının kendi pencereleri kullanılır.

export function showMessage(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Onay ister; kullanıcı onaylarsa `onConfirm` çalışır. */
export function confirmAction({
  title,
  message,
  confirmText,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
}): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) void onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: () => void onConfirm() },
  ]);
}
