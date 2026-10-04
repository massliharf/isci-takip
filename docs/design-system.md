# İşçi Takip — Tasarım Sistemi

Referans: Magnific App tasarım incelemesi (magnific.com/app, Eylül 2026). Bu belge o referansın
**mobil uygulamaya uyarlanmış** halidir. Kodda karşılığı:

- Token'lar: `src/theme/tokens.ts`
- Gezinme (header, tab bar): `src/theme/navigation.ts`
- Bileşenler: `src/components/ui.tsx`

## 1. İlkeler

| Referanstan alınan | Uygulamadaki karşılığı |
|---|---|
| Nötr, içerik öncelikli; renk yalnızca anlam taşıdığında | Gri zemin + beyaz kartlar. Renk sadece puantaj durumu, para (alacak/borç) ve "oluştur" aksiyonunda |
| Kenarlık yerine ton | Kartlar kenarlıksız ve gölgesiz; `#F5F5F5` zemin üstünde beyaz `r16` yüzey |
| Birincil aksiyon siyah | "Giriş yap", "Kaydet", "Avans ver" → `#1A1A1A` dolgulu buton |
| Pembe yalnızca oluşturma girişi | İşçiler ve Kasa başlığındaki pembe `+` butonu. Başka yerde pembe kullanılmaz |
| Kenarlıksız input, %5 gri dolgu | `Field`: gri dolgu, odakta mavi (`#3B6FE8`) 1 px kenarlık + beyaz zemin |
| BÜYÜK HARF bölüm etiketleri | `Section` / `overline`: 11 px, 600, büyük harf (Türkçe kurallarıyla: i → İ) |
| Kategori renkleri (tam ton + %10–15 alfa zemin) | Puantaj durumları ve kasa kayıt türleri (aşağıda) |
| Pasif birincil buton gri | Gerekli alanlar boşken buton `#E3E3E3` zemin, `#616161` metin |
| Overlay'de gölge, kartlarda değil | Yalnızca alttan açılan `ActionMenu` kenarlıklı ve karartılmış zemin üstünde |

## 2. Mobil uyarlamalar (referanstan bilinçli sapmalar)

| Konu | Referans (web) | Uygulama (mobil) | Neden |
|---|---|---|---|
| Kontrol yüksekliği | 32 / 40 px | 36 / 44 / 52 px | iOS HIG asgari dokunma hedefi 44 pt |
| Varsayılan UI metni | 12 px | 14 px | Telefonda 12 px okunaksız; şantiye koşulları |
| Input font boyutu | 14 px | 16 px | iOS'ta 16'nın altı odakta ekranı yakınlaştırır |
| Display fontu | Klarheit (ticari) | Geist SemiBold | Lisans; referansın önerdiği açık kaynak alternatif |
| Rail (72 px ikon şeridi) | Sol kenar | Alt tab bar, ikon + etiket | Mobil gezinme kalıbı |
| "+" menüsü | Rail'den açılan dropdown | Alttan açılan menü (`ActionMenu`) | Başparmakla erişim |
| Dark tema | Kısmi | Yok (yalnız açık tema) | Referansta dark değerlerinin çoğu ölçülmemiş |

## 3. Renk

### Yüzey ve metin
| Token | Değer | Kullanım |
|---|---|---|
| `bgApp` | `#F5F5F5` | Ekran zemini, header |
| `surface` | `#FFFFFF` | Kart, tab bar, menü |
| `track` | `#EDEDED` | Segmented rayı |
| `control` | `rgba(115,115,115,.06)` | Input, stepper, chip dolgusu |
| `controlActive` | `rgba(115,115,115,.15)` | Basılı liste öğesi |
| `disabled` | `#E3E3E3` | Pasif buton |
| `textPrimary` / `textSecondary` / `textTertiary` | `#1A1A1A` / `#616161` / `#737373` | Metin hiyerarşisi (opaklık değil renk) |
| `border` | `rgba(16,16,16,.10)` | Ayırıcı, ikincil buton, chip |

### Aksiyon ve anlam
| Token | Değer | Kullanım |
|---|---|---|
| `actionPrimary` | `#1A1A1A` | Birincil buton |
| `brand` | `#FF57AE` | Yalnızca `+` oluştur butonu (üstünde koyu ikon) |
| `focus` | `#3B6FE8` | Input odağı, switch, "Bugüne dön" bağlantısı |
| `positive` | `#0E8A5F` | Alacak, gelir (referans mint'inin okunur koyu tonu) |
| `negative` | `#D93036` | Borç, fazla ödeme, hata, silme |

### Puantaj durumları (`statusTone`)
| Durum | Ton | Zemin | Metin |
|---|---|---|---|
| Tam gün | `#17CB8D` | %15 | `#0B6B4A` |
| Yarım gün | `#4F69F2` | %15 | `#2E46C4` |
| İzinli | `#8566DC` | %15 | `#5B3FB0` |
| Gelmedi | `#E5484D` | %13 | `#B4272C` |

Açık tonlar beyaz zeminde metin için yeterli kontrast vermediği için her tonun bir de koyu `ink`
rengi var: zemin `soft`, nokta `color`, yazı `ink`.

### Kasa kayıt türleri (`categoryTone`)
Gelir mint, gider gül (`#CC7E80`), avans/ödeme mavi, işçi/profil mor. 40×40 ikon kutusunda gösterilir.

## 4. Tipografi — Geist

| Varyant | Boyut / satır | Ağırlık | Kullanım |
|---|---|---|---|
| `display` | 28 / 36, −0.4 | 600 | Bakiye, toplam, uygulama adı |
| `heading` | 20 / 28, −0.2 | 500 | Boş durum başlığı, form başlığı |
| `title` | 16 / 22 | 500 | Liste/kart başlığı (işçi adı) |
| `body` | 15 / 22 | 400 | Paragraf |
| `ui` | 14 / 20 | 500 | Buton, satır değeri, varsayılan arayüz metni |
| `caption` | 13 / 18 | 400 | Yardımcı ve ikincil bilgi |
| `overline` | 11 / 16, +0.4 | 600, BÜYÜK HARF | Bölüm ve alan etiketleri |

Her zaman `Text` bileşeni kullanılır (`react-native`'in `Text`'i değil); font ailesi ağırlığa göre seçilir
(Android'de `fontWeight` özel fontlarla çalışmadığı için).

## 5. Boşluk, köşe, boyut
- **Boşluk:** 4 px tabanlı. `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 28`. Ekran kenarı ve bloklar arası 16.
- **Köşe:** `xs 4` chip · `sm 8` buton, input, ikon kutusu · `md 12` stepper · `lg 16` kart, menü.
- **Kontrol:** `xs 28` · `sm 36` ikon butonu, segment · `md 44` buton, input · `lg 52` form gönder butonu, stepper.

## 6. Bileşenler (`src/components/ui.tsx`)

| Bileşen | Not |
|---|---|
| `Screen` | Gri zeminli kaydırılabilir sayfa, 16 px kenar ve blok aralığı |
| `Card` | Beyaz, `r16`, gölgesiz. Listeler için `padded={false}` + `Divider inset` |
| `Section` | Üstte overline etiket (+ sağda isteğe bağlı toplam), altında içerik |
| `Stat` | Overline etiket + display rakam + açıklama. Ekranın ana rakamı |
| `Row` | Solda ikincil etiket (+ ipucu), sağda değer |
| `Button` | `primary` siyah · `secondary` beyaz+kenarlık · `ghost` · `danger` kırmızı-açık · `brand` pembe. Pasifken gri |
| `IconButton` | 36×36 `r8`; `control`, `ghost`, `brand` |
| `Field` | Overline etiket, gri dolgulu input, odakta mavi kenarlık |
| `DateStepper` / `MonthStepper` | ‹ değer › ; etikete dokununca bugüne/bu aya döner. Form içinde `filled` |
| `Segmented` | Gri ray; etkin segment beyaz, ya da `tone` ile renkli nokta + açık zemin |
| `Chip` | 24 px, `r4`, kenarlıklı meta etiketi; `tone` ile renkli |
| `IconBox` | Kategori renginde ikon, aynı rengin açık tonunda kutu |
| `ActionMenu` | Alttan açılan oluştur menüsü |
| `EmptyState` | İkon + başlık + tek satır açıklama + isteğe bağlı aksiyon |
| `ErrorText` | Açık kırmızı zeminli uyarı satırı |
| `Kpi` / `KpiRow` | Küçük rakam kutuları, yan yana (2–3 adet) |
| `ListRow` / `ListCard` | Avatar/ikon + başlık + alt satır + sağda değer; kart içinde ayırıcılı liste |
| `Avatar` | Baş harfler; renk isimden türetilir, aynı kişi her ekranda aynı renkte |
| `Progress` | İnce ilerleme çubuğu (günün puantaj doluluğu) |
| `QuickChips` | Hızlı seçim (tutar, açıklama önerileri) |
| `SearchField` | Beyaz zeminli arama kutusu |
| `WeekStrip` | Haftalık gün şeridi; nokta = günün puantaj durumu |
| `ExportMenu` | "Dışa aktar" butonu + biçim seçimi (PDF kırmızı, Excel yeşil ikon) |
| `ToastProvider` / `useToast` | Altta kısa süreli onay/hata bildirimi |

İkonlar: Feather (`@expo/vector-icons/Feather`), çizgi stili; 16 (küçük buton), 18 (buton, menü), 22 (tab bar).

## 7. Marka, kahraman kart ve hareket
- **Logo** (`assets/logo.svg`, `src/components/Logo.tsx`): tuğla duvarın üstünde onay işareti — "puantaj tamam". Marka gradyanı `#FF57AE → #FF8A3D` (referansın pembesi + tuğla turuncusu).
- **Kahraman kart** (`HeroCard`): her ekranın ana rakamı koyu gradyanlı (`#141414 → #2B2530`) kartta, 38 px rakam, köşede yumuşak pembe ışık. Altında `HeroStats` ince ayırıcılı üç küçük rakam. Rakam yeni değere akarak gelir.
- **Renk dağılımı**: nötr zemin korunur; renk kategori tonlarıyla gelir (puantaj durumları, görevler, gelir/gider kategorileri, KPI ikon kutuları). Sekme çubuğunda etkin sekme marka mürekkebi `#C2186F`.
- **Hareket** (`src/components/motion.tsx`, `motion` token'ları): içerik aşağıdan yükselerek sırayla gelir (45 ms aralık, yay damping 18); butonlar ve çipler basınca %97'ye küçülür; segmented göstergesi yaylı kayar; ilerleme/bütçe çubukları dolarak açılır; bildirim aşağıdan kayarak çıkar.
- **Tipografi**: Geist; büyük rakamlarda sıkı harf aralığı (−1,4), tutarlar sabit genişlikli rakamlarla (`tabular-nums`).

## 8. Bilgi hiyerarşisi
Her ekran aynı sırayı izler: **(1) ana rakam** (`Stat`) → **(2) birincil aksiyon** → **(3) destekleyici rakamlar** (`KpiRow`) → **(4) liste** → **(5) dışa aktarma** en altta.
Tutarlar tam sayıysa kuruşsuz gösterilir (`1.500 ₺`), `₺` satır sonunda tek kalmaz.

## 9. Ekran kalıpları
- **Başlık:** Ekran zemininde, gölgesiz; sekme ekranlarında sola dayalı 20 px başlık, sağda en fazla bir aksiyon.
- **Ana rakam önce:** Her sekme bir `Stat` kartıyla başlar (günlük işçilik, kalan borç, net kalan).
- **Liste:** Tek kart içinde ayırıcılı satırlar; satır basılınca `controlActive` zemin; silme uzun basma ile.
- **Form:** Alanlar tek kartta, gönder butonu kartın altında tam genişlik `lg`.
- **Boş durum:** Ortalanmış ikon + başlık + açıklama; ilgili aksiyon butonu.
