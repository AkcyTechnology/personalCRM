# Açık Kalan Sorunlar

Önem sırasıyla listelendi. Kapatılanlar en altta.

## Yüksek (yayından önce senin yapman gerekenler)

| ID | Sorun | Neden açık | Öneri |
|---|---|---|---|
| R-01 | Uygulama gerçek iOS/Android cihazda hiç test edilmedi: bildirimler, Face ID, Keychain, rehber, kaydırma, titreşim, widget, paylaşım | Bu ortamda emülatör ya da cihaz yok | `eas build --profile development --platform all`, sonra RELEASE_CHECKLIST'teki cihaz adımları ve `.maestro/core-journey.yaml` |
| R-02 | Yeni native modüller var (`expo-widgets`, `@expo/ui`, `expo-system-ui`, `react-native-svg`, `react-native-view-shot`, `expo-localization`); eski build ile uygulama açılmaz | Native derleme gerekiyor | Yeni development ve production build al |
| R-03 | Gizlilik politikası ve kullanım şartları hukukçu onayı bekliyor | Hukuki inceleme gerekiyor | Metinler uygulamada ve `docs/privacy.html`, `docs/terms.html` içinde hazır; GitHub Pages ile yayınla, URL'yi mağazalara gir |
| R-04 | `npm audit`: geliştirme araçlarında yüksek seviyeli açıklar (SEC-11) | Expo SDK yükseltmesi gerekiyor. Bu paketler uygulama paketine girmiyor | Dependabot ve Expo SDK güncellemeleri |

## Orta

| ID | Sorun | Öneri |
|---|---|---|
| R-05 | Her yazmada tüm veri yeniden şifreleniyor. Node'da 4 MB (2.000 kişi × 20 an) için şifreleme ~0.6 sn, çözme ~1 sn. Hermes'te ölçülmedi | Normal kullanımda (≤300 kişi) sorun beklenmez. Büyürse kişi başına anahtar/değer ya da SQLite + SQLCipher |
| R-06 | Görünüm (açık/koyu) değişikliği uygulama yeniden açılınca uygulanıyor | Tüm ekranları dinamik stile çevirmek gerekir; bilinçli bir tercih, ayarda yazıyor |
| R-07 | Ana ekran widget'ı yalnızca iOS'ta; cihazda denenmedi | `expo-widgets` Android desteği deneysel. Önce iOS cihazda dene, sonra `enableAndroid` |
| R-08 | Anonim istatistik için PostHog anahtarı ve proje ayarı yapılmadı | MARKETING.md §6: EU bölgesi, "Discard client IP data", `EXPO_PUBLIC_POSTHOG_KEY` |
| R-09 | VoiceOver/TalkBack ile cihazda gezinme ve en büyük yazı boyutu testi yapılmadı | Cihazda ekran okuyucu testi |
| R-10 | İngilizce metinleri anadili İngilizce olan biri gözden geçirmedi | Bir kez okutmak yeterli; `src/i18n/en.ts` |
| R-11 | Ekran dosyaları büyük (Kişi ekleme, İçgörüler, Kartvizit ~1100–1300 satır) | Ortak `Button`, `Card`, `Input` bileşenleri çıkararak bölmek |
| R-12 | Sunucu yok; telefon değişince veri yalnızca elle alınan yedekle taşınıyor | İhtiyaç olursa isteğe bağlı eşitleme. **O zaman güvenlik denetimi yeniden yapılmalı** |
| R-13 | Mağaza ekran görüntüleri web derlemesinden üretildi | Cihazdan çekilmiş görüntülerle karşılaştır; `e2e/store-screenshots.js` aynı çerçeveyi kullanabilir |

## Düşük

| ID | Sorun | Öneri |
|---|---|---|
| R-15 | Web sürümünde veri şifresiz | Web yalnızca görmek için derleniyor, yayınlanmayacak; sorun değil |
| R-16 | Bazı eski çipler 40 px yüksekliğinde (önerilen 44 px) | `minTouch = 44` token'ı |
| R-17 | Abonelik ekranı yalnızca bilgi veriyor | Ücretli plan gerekirse RevenueCat + sunucuda doğrulama |
| R-18 | MobSF taraması yapılmadı (APK gerekiyor) | Production APK üzerinde MobSF |
| R-19 | Sesli an kaydı, yapay zekâ koçu ve dünya haritası yok | Ses ve AI sunucu ile LLM gerektiriyor, gizlilik ayrıca tasarlanmalı; harita konum ve geocoding istiyor |
| R-20 | Uygulama içinde değerlendirme isteği yok | Ağaç ilk büyüdüğünde `expo-store-review` |

## Kapatılanlar (bu sürüm)

| Eski ID | Ne yapıldı |
|---|---|
| Karanlık mod yok | Sistem / Açık / Koyu; tüm renkler token'dan |
| Çok dil yok | Türkçe + İngilizce; iOS izin metinleri de iki dilde (`locales/`) |
| Renk dağınıklığı, palet dışı renkler | Mavi kaldırıldı, sıcak mercan vurgu eklendi, tüm renkler `colors.ts`'den |
| Form ipucu kontrastı (2.5:1) | 4.8:1 |
| Onboarding gradyanı kontrastı (3.1:1) | Beyaz yazı tüm gradyanda ≥ 4.5:1 |
| "Geri al" balonu ekran okuyucuda çok kısa | Ekran okuyucu açıkken 3 kat uzun |
| Titreşim kapatılamıyor | Profil → Titreşim |
| Kullanıcı davranışı ölçülmüyor | İzinli, anonim istatistik (PostHog EU) |
| Büyüyen bir canlı / ödül yok | Bağ ağacı, aşama kutlaması, değişen ödül mesajları |
| Ana ekran widget'ı yok | iOS widget (cihazda test bekliyor, R-07) |
| Semgrep çalıştırılamadı | 432 kural, 94 dosya: gerçek güvenlik bulgusu yok (SECURITY_REPORT) |
| Gizlilik metni için herkese açık URL yok | `docs/privacy.html`, `docs/terms.html` (`npm run legal`) |
| Mağaza formları ve görselleri | `STORE_LISTING.md`, `store/screenshots/` |
| Yedek dosyası şifresiz | Parolalı yedek: scrypt (N=2^15) + XChaCha20-Poly1305, başlık doğrulamalı; yanlış parolada tekrar deneme |
| Çok kişiyle hız ölçülmedi | `__tests__/performance.test.ts`: 2.000 kişi; Ana sayfa hesapları 900 → 320 ms |
