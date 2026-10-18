# Açık Kalan Sorunlar

Önem sırasıyla listelendi. Her maddede neden kapatılamadığı ve önerilen çözüm yazıyor.

## Yüksek

| ID | Sorun | Neden açık | Öneri |
|---|---|---|---|
| R-01 | Uygulama gerçek iOS/Android cihazda hiç test edilmedi: bildirimler, Face ID, Keychain, rehber, kaydırma, haptik | Bu ortamda emülatör ya da cihaz yok | Development build al (`eas build --profile development`), `.maestro/core-journey.yaml` akışını çalıştır ve RELEASE_CHECKLIST'teki cihaz adımlarını uygula |
| R-02 | `npm audit`: Expo/Metro/jest araç zincirinde 27 high + 13 moderate açık (SEC-11) | Düzeltmeler büyük sürüm yükseltmesi ya da geriye dönük kırılma istiyor. Bu paketler uygulama paketine girmiyor | Dependabot PR'larını takip et; Expo SDK güncellemelerini uygula |
| R-03 | Marka turkuazı erişilebilirlik için koyulaştırıldı (#00B5AC → #00857E) | Ürün sahibinin onayı gerekiyor | Onaylanmazsa: turkuazı yalnızca dekoratif öğelerde kullan, metin ve butonlarda koyu tonu koru |

## Orta

| ID | Sorun | Öneri |
|---|---|---|
| R-04 | Karanlık mod yok (`userInterfaceStyle: light`) | `useColorScheme` ile açık ve koyu token setleri. Renkler artık tek yerde olduğu için geçiş kolaylaştı |
| R-05 | Her yazmada tüm veri yeniden şifreleniyor (Node'da 1 MB için 94 ms; Hermes'te daha yavaş olabilir) | Kişi başına anahtar/değer ya da SQLite + SQLCipher (`expo-sqlite`) |
| R-06 | Gizlilik politikası ve kullanım şartları birer taslak | Hukukçu incelemesi; metni hem uygulamada hem herkese açık bir URL'de yayınla (mağazalar URL istiyor) |
| R-07 | ~~Çok dil desteği yok~~ **Kapatıldı:** Türkçe + İngilizce, telefon diline göre otomatik; Profil'den değiştirilebilir. İngilizce metinler anadil konuşanı tarafından gözden geçirilmeli | — |
| R-08 | Ekran dosyaları hâlâ büyük (BusinessCard ~1100, Insights ~1280, AddContact ~1275 satır) | Ortak `Button`, `Card`, `Input` bileşenleri çıkararak bölmek |
| R-09 | Kod tarafındaki erişilebilirlik eksikleri kapatıldı (Onboarding noktaları, bildirim anahtarları, kartvizit ve QR, içe aktarma kutuları, ⓘ butonları, grafikler, çipler, ton seçimi, form etiketleri, modal butonları). **Açık kalan:** VoiceOver/TalkBack ile cihazda gezinme ve en büyük yazı boyutu testi | Cihazda ekran okuyucu testi |
| R-10 | Backend yok. Cihaz değişince veri yalnızca manuel yedekle taşınabiliyor | İhtiyaç olursa Supabase (Auth + RLS) ile isteğe bağlı eşitleme. **O zaman güvenlik denetimi yeniden yapılmalı** |

## Düşük

| ID | Sorun | Öneri |
|---|---|---|
| R-11 | Onboarding PNG'leri toplam 2.6 MB | WebP'ye çevir veya pngquant ile sıkıştır |
| R-12 | Yedek `.json` dosyası şifresiz | İsteğe bağlı parolalı yedek (scrypt + XChaCha) |
| R-13 | Web sürümünde veri şifresiz | Web'i yalnızca demo olarak konumlandır veya WebCrypto + parola kullan |
| R-14 | Eski bazı çipler 40 px yüksekliğinde (önerilen 44 px) | Tasarım token'ı: `minTouch = 44` |
| R-15 | Onboarding gradyanı (#00A39B üzerinde beyaz ≈ 3.1:1) | Koyu ton gradyan veya düz `primary` |
| R-16 | "Geri al" balonu 5 sn sonra kayboluyor | Ekran okuyucu açıkken süreyi uzat |
| R-17 | Abonelik ekranı yalnızca bilgi veriyor; ödeme altyapısı yok | Ücretli plan gerekirse RevenueCat + sunucuda doğrulama |
| R-18 | Semgrep ve MobSF taramaları çalıştırılamadı | CI'a `semgrep ci` ekle; release APK için MobSF |
| R-19 | Sesli an kaydı, yapay zekâ koçu, ana ekran widget'ı ve dünya haritası eklenmedi | Ses/AI bir sunucu ve LLM gerektiriyor (gizlilik açısından ayrıca tasarlanmalı); widget native WidgetKit/AppWidget kodu istiyor; harita konum ve geocoding istiyor |
