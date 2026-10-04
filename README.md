# İşçi Takip

İnşaat / duvar ustaları için işçi, puantaj, yevmiye ve alacak-verecek takip uygulaması.
iOS ve Android için **Expo (React Native)**, veritabanı ve üyelik için **Supabase**.

## Özellikler

Uygulama 4 sekmeden oluşur. Hesap ayarları Özet ekranının sağ üstündedir.

| Ekran | Ne yapar |
|---|---|
| **Puantaj** | Haftalık gün şeridi; her günün altındaki nokta o günün tamam olup olmadığını gösterir. Her işçi için tek dokunuşla *Tam / Yarım / İzinli / Yok*. Kayıt anında görünür, sunucu hatasında geri alınır. "Kalanlara tam gün yaz" toplu butonu ve günlük işçilik toplamı. |
| **İşçiler** | Ödenecek toplam, fazla ödenen, aktif/pasif sayısı. Arama, filtre (aktif / bakiyesi olan / tümü) ve bakiyeye ya da isme göre sıralama. |
| **İşçi kartı** | Toplam alacak; arama ve WhatsApp butonları; *Avans ver* ve *Hesap kapat* (kalan alacağı öder). **Aylık** görünüm: devreden, hak edilen, verilen, ay sonu bakiye, dokunarak düzeltilebilen puantaj takvimi, ödemeler. **Tüm geçmiş**: ay ay gün, hak edilen, verilen ve kümülatif bakiye. |
| **Avans / ödeme** | İşçinin güncel alacağını gösterir. Hızlı tutar çipleri (500 / 1.000 / … / tüm alacak) ve kayıttan sonraki bakiye önizlemesi. |
| **Kasa** | Ayın kasa neti; giren, işçilere verilen ve gider toplamları. Tarihe göre gruplanmış tek liste, türe göre filtre. Gelir ve gider için hazır açıklamalar. |
| **Özet** | Net kalan (gelir − işçilik − gider), işçilerin ay başı ve ay sonu bakiyesi, kasa neti, puantaj istatistikleri, işçi bazında döküm. |
| **Hesap** | Ad ve işletme adı (raporların başlığında görünür), tüm verileri dışa aktarma, çıkış. |

### Dışa aktarma
| Nereden | Biçim | İçerik |
|---|---|---|
| İşçi kartı → Aylık | PDF | **Hesap ekstresi**: gün gün puantaj, avans/ödemeler, devreden → kalan alacak. İşçiye WhatsApp'tan gönderilebilir. |
| İşçi kartı → Aylık | Excel | O ayın tüm hareketleri |
| İşçi kartı → Tüm geçmiş | PDF / Excel | Ay ay özet; Excel'de ayrıca gün gün tüm hareketler |
| Özet | PDF / Excel | Aylık rapor, **puantaj cetveli** (işçi × gün tablosu) |
| Kasa | Excel | Ayın tarih sıralı kasa dökümü |
| Hesap | Excel / JSON | Tüm puantaj, tüm ödemeler, tam yedek |

Excel dosyaları Türkçe Excel'in doğrudan açtığı biçimde (`;` ayraçlı, UTF-8) CSV olarak üretilir. Web'de PDF, tarayıcının yazdırma penceresinden "PDF olarak kaydet" ile alınır.

### Hesaplama kuralları
- Tam gün = 1 yevmiye, yarım gün = 0,5 yevmiye, izinli ve gelmedi = 0.
- İşçi alacağı = Σ hak edilen yevmiye − Σ (avans + ödeme). Negatifse işçiye fazla ödenmiştir.
- **Devreden** = ay başına kadarki bakiye; **ay sonu bakiye** = devreden + bu ay hak edilen − bu ay verilen.
- Takvimden geçmiş bir günün durumu değiştirilirse o günün kayıtlı yevmiyesi korunur.
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

### 4. Web (GitHub Pages) — otomatik
Her push'ta `.github/workflows/pages.yml` web sürümünü derleyip **https://massliharf.github.io/isci-takip/** adresine yayınlar.
İlk kurulumda bir kez: GitHub → **Settings → Pages → Source: GitHub Actions**.

### 5. Web (EAS Hosting) — alternatif
```bash
npx eas-cli@latest login     # ilk sefer
npm run deploy:web           # dist/ klasörünü oluşturur ve yayınlar → https://<ad>.expo.app
```
Supabase → Authentication → URL Configuration → **Site URL** alanına web adresini yaz (şifre sıfırlama e-postaları buraya yönlenir).

## Tasarım
Arayüz, `docs/design-system.md` dosyasındaki tasarım sistemine göre yapılır (renk, tipografi, bileşenler).
Örnek ekran görüntüleri `docs/screenshots/` altında.

## Geliştirme
```bash
npm run typecheck   # TypeScript
npm test            # hesaplama birim testleri
npx expo lint       # ESLint
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
src/theme/tokens.ts                 tasarım token'ları (renk, tip, boşluk)
src/components/ui.tsx               ortak bileşenler
src/lib/calc.ts                     hesaplama (saf fonksiyonlar, testli)
src/lib/api.ts                      Supabase veri erişimi
```

## Sonraki adımlar (öneri)
- Şantiye/proje bazlı takip (gelir ve puantajı şantiyeye bağlama)
- Mesai / ek ücret, hafta sonu farklı yevmiye
- Birden fazla kullanıcı (ustabaşı puantaj girer, patron raporu görür)
- Çevrimdışı puantaj girişi ve senkronizasyon
- Excel dışa aktarma
