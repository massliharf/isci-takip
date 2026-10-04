# İşçi Takip

İnşaat / duvar ustaları için işçi, puantaj, yevmiye ve alacak-verecek takip uygulaması.
iOS ve Android için **Expo (React Native)**, veritabanı ve üyelik için **Supabase**.

## Özellikler

| Modül | Ne yapar |
|---|---|
| **Üyelik** | E-posta + şifre ile üye ol / giriş / şifre sıfırlama (Supabase Auth). Her kullanıcı kendi işletmesinin verisini görür (RLS). |
| **İşçiler** | İşçi ekle/düzenle/sil, günlük yevmiye, telefon, başlama tarihi, not, aktif/pasif. |
| **Puantaj** | Günü seç → her işçi için tek dokunuşla *Tam / Yarım / İzinli / Gelmedi*. “Kalan herkese tam gün” toplu butonu. O günün yevmiyesi kayda kopyalanır; yevmiye sonradan değişse de geçmiş bozulmaz. |
| **Avans / Ödeme** | İşçiye verilen avans ve maaş ödemeleri. |
| **İşçi detayı** | Tüm zamanların alacağı (hak edilen − verilen), aylık özet, renkli puantaj takvimi, ay içindeki ödemeler. |
| **Kasa** | İşletme gelirleri (hakediş vb.), diğer giderler (malzeme vb.), işçilere verilenler – ay ay. |
| **Aylık rapor** | Toplam gelir, işçilik gideri, diğer giderler, **net kalan**; işçi işçi gün sayıları ve tutarlar. PDF olarak paylaş (WhatsApp, e-posta…). |

### Hesaplama kuralları
- Tam gün = 1 yevmiye, yarım gün = 0,5 yevmiye, izinli ve gelmedi = 0.
- İşçi alacağı = Σ hak edilen yevmiye − Σ (avans + ödeme). Negatifse işçiye fazla ödenmiştir.
- Aylık **net kalan** = gelir − işçilik gideri (hak edilen) − diğer giderler.
- **Kasa net** = gelir − işçilere fiilen verilen − diğer giderler.

## Kurulum

### 1. Supabase
1. [supabase.com](https://supabase.com) üzerinde yeni proje oluştur.
2. **SQL Editor** → `supabase/migrations/0001_init.sql` dosyasının içeriğini yapıştırıp çalıştır
   (veya Supabase CLI ile: `supabase link` + `supabase db push`).
3. **Project Settings → API** sayfasından *Project URL* ve *anon public key*’i al.
4. İstersen **Authentication → Providers → Email** altında “Confirm email”i kapatarak e-posta doğrulamasız üyelik açabilirsin.

### 2. Uygulama
Supabase bağlantı bilgileri `src/lib/config.ts` içinde hazır. Başka bir projeye bağlamak için `.env.example` dosyasını `.env` olarak kopyalayıp değerleri değiştirebilirsin.

```bash
npm install
npx expo start            # Expo Go ile telefonda QR okut
```

### 3. Mağaza derlemesi (EAS)
```bash
npx eas-cli@latest build --platform ios
npx eas-cli@latest build --platform android
```

## Geliştirme
```bash
npm run typecheck   # TypeScript
npm test            # hesaplama birim testleri
```

## Proje yapısı
```
supabase/migrations/0001_init.sql   tablolar, RLS politikaları, worker_balances view'ı
src/app/                            ekranlar (expo-router)
  (auth)/login, register            üyelik
  (tabs)/index                      günlük puantaj
  (tabs)/workers                    işçi listesi + bakiye
  (tabs)/finance                    gelir / gider / avans (kasa)
  (tabs)/report                     aylık rapor + PDF
  (tabs)/settings                   hesap, çıkış
  worker/[id], worker/new, worker/edit/[id]
  payment/new, income/new, expense/new
src/lib/calc.ts                     hesaplama (saf fonksiyonlar, testli)
src/lib/api.ts                      Supabase veri erişimi
```

## Sonraki adımlar (öneri)
- Şantiye/proje bazlı takip (gelir ve puantajı şantiyeye bağlama)
- Mesai / ek ücret, hafta sonu farklı yevmiye
- Birden fazla kullanıcı (ustabaşı puantaj girer, patron raporu görür)
- Çevrimdışı puantaj girişi ve senkronizasyon
- Excel dışa aktarma
