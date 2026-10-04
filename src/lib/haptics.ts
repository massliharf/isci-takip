import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Dokunsal geri bildirim; web'de ve desteklemeyen cihazlarda sessizce atlanır
export function tapFeedback(): void {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

export function successFeedback(): void {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
