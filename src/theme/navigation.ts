import { fonts, palette } from './tokens';

// Başlık ekran zeminiyle aynı tonda; ayrı bir şerit gibi görünmez.
const header = {
  headerStyle: { backgroundColor: palette.bgApp },
  headerShadowVisible: false,
  headerTintColor: palette.textPrimary,
  headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 16, color: palette.textPrimary },
  headerBackTitle: 'Geri',
} as const;

export const stackScreenOptions = {
  ...header,
  contentStyle: { backgroundColor: palette.bgApp },
} as const;

export const tabScreenOptions = {
  ...header,
  headerTitleStyle: { fontFamily: fonts.semibold, fontSize: 20, color: palette.textPrimary },
  headerTitleAlign: 'left',
  tabBarActiveTintColor: palette.textPrimary,
  tabBarInactiveTintColor: palette.textTertiary,
  tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
  tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
  sceneStyle: { backgroundColor: palette.bgApp },
} as const;
