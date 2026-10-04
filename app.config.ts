import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json'daki ayarlara ek olarak, web derlemesi alt klasörde yayınlanacaksa
// (GitHub Pages: /isci-takip) EXPO_BASE_URL ile taban yolu verilir.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
