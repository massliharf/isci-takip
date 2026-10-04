// Tasarım token'ları. Kaynak: docs/design-system.md (Magnific referansının mobile uyarlaması).
// Bileşenler renk/ölçü değerlerini doğrudan yazmaz, buradan alır.

export const palette = {
  // yüzeyler
  bgApp: '#F5F5F5', // ekran zemini (kartların arkası)
  surface: '#FFFFFF', // kart, tab bar, menü
  track: '#EDEDED', // segmented rayı
  control: 'rgba(115,115,115,0.06)', // input, select, chip dolgusu
  controlActive: 'rgba(115,115,115,0.15)', // basılı/etkin öğe
  disabled: '#E3E3E3',

  // metin
  textPrimary: '#1A1A1A',
  textStrong: '#0D0D0D',
  textSecondary: '#616161',
  textTertiary: '#737373',
  textOnDark: '#FFFFFF',

  // çizgi
  border: 'rgba(16,16,16,0.10)',
  borderSubtle: 'rgba(16,16,16,0.05)',
  borderStrong: 'rgba(16,16,16,0.20)',

  // aksiyon
  actionPrimary: '#1A1A1A', // sayfa aksiyonu (siyah buton)
  brand: '#FF57AE', // yalnızca "oluştur" girişi
  brandSoft: 'rgba(255,88,174,0.15)',
  focus: '#3B6FE8',
  info: '#506BF2',

  // anlam (para)
  positive: '#0E8A5F', // alacak, gelir — beyaz/gri zeminde okunur koyu mint
  negative: '#D93036', // borç, gider
  negativeSoft: 'rgba(217,48,54,0.10)',
} as const;

/** Puantaj durumları — referanstaki "kategori rengi" kalıbı: tam ton + %15 alfa zemin */
export const statusTone = {
  full: { color: '#17CB8D', soft: 'rgba(23,203,141,0.15)', ink: '#0B6B4A' },
  half: { color: '#4F69F2', soft: 'rgba(79,105,242,0.15)', ink: '#2E46C4' },
  leave: { color: '#8566DC', soft: 'rgba(133,102,220,0.15)', ink: '#5B3FB0' },
  absent: { color: '#E5484D', soft: 'rgba(229,72,77,0.13)', ink: '#B4272C' },
} as const;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const radius = { xs: 4, sm: 8, md: 12, lg: 16, pill: 9999 } as const;

/**
 * Kontrol yükseklikleri. Referans web'de 32/40 px; dokunmatik hedef için (iOS HIG 44 pt)
 * mobilde bir kademe büyütüldü.
 */
export const control = { xs: 28, sm: 36, md: 44, lg: 52 } as const;

export const fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
} as const;

export type FontWeight = keyof typeof fonts;

/**
 * Tip ölçeği. Referansın 12 px UI metni telefonda küçük kaldığı için mobilde 14 px'e çıkarıldı;
 * oranlar (UI < gövde < başlık < display) korundu.
 */
export const type = {
  display: { fontSize: 28, lineHeight: 36, weight: 'semibold', letterSpacing: -0.4 },
  heading: { fontSize: 20, lineHeight: 28, weight: 'medium', letterSpacing: -0.2 },
  title: { fontSize: 16, lineHeight: 22, weight: 'medium', letterSpacing: 0 },
  body: { fontSize: 15, lineHeight: 22, weight: 'regular', letterSpacing: 0 },
  ui: { fontSize: 14, lineHeight: 20, weight: 'medium', letterSpacing: 0 },
  caption: { fontSize: 13, lineHeight: 18, weight: 'regular', letterSpacing: 0 },
  overline: { fontSize: 11, lineHeight: 16, weight: 'semibold', letterSpacing: 0.4 },
} as const satisfies Record<string, { fontSize: number; lineHeight: number; weight: FontWeight; letterSpacing: number }>;

export type TypeVariant = keyof typeof type;

/** Kasa kayıt türleri için kategori tonları */
export const categoryTone = {
  income: { color: '#17CB8D', soft: 'rgba(23,203,141,0.12)' },
  expense: { color: '#CC7E80', soft: 'rgba(204,126,128,0.14)' },
  payment: { color: '#4F69F2', soft: 'rgba(79,105,242,0.12)' },
  worker: { color: '#8566DC', soft: 'rgba(133,102,220,0.12)' },
} as const;
