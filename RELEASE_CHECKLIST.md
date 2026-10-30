# Sürüm Kontrol Listesi

**İşaretler:** [x] doğrulandı (kanıtı TEST_RESULTS.md'de) · [ ] yapılacak

## Kod ve otomasyon
- [x] `npx tsc --noEmit` → 0 hata
- [x] `npx eslint .` → 0 sorun
- [x] `npx jest --ci` → 67/67 geçti (performans testi dahil)
- [x] `node e2e/web-smoke.js` → 48/48 geçti (TR + EN + koyu tema)
- [x] Semgrep (432 kural): gerçek güvenlik bulgusu yok
- [x] `expo export` Android, iOS ve web paketleri derleniyor
- [x] Sır taraması temiz (çalışma dizini + git geçmişi)
- [x] `npm audit` kritik açık yok
- [ ] `npm audit` yüksek seviyeli açıklar (derleme araçlarında) — Expo SDK güncellemesini bekliyor
- [ ] CI GitHub'da yeşil (`.github/workflows/ci.yml` ilk PR'da çalışacak)

## Cihaz testleri (her biri hem iOS hem Android'de)
- [ ] Development build: `eas build --profile development --platform all`
- [ ] Maestro: `maestro test .maestro/core-journey.yaml`
- [ ] Bildirim izni doğru anda isteniyor (ilk kişi eklendiğinde)
- [ ] Takip bildirimi geliyor; "Görüştüm ✓" ve "Yarın hatırlat" aksiyonları çalışıyor
- [ ] Doğum günü bildirimi (bir test kişisinin doğum gününü yarına ayarla)
- [ ] Uygulama kilidi: açma, kapatma, 30 sn arka plan sonrası kilitlenme, uygulama değiştiricide içeriğin gizlenmesi
- [ ] Rehber: iOS'ta izin istemeden sistem seçicisi; Android'de izin akışı; toplu aktarma
- [ ] Kaydırma: Kişiler listesinde sola kaydırınca Görüştüm/Ertele
- [ ] Yedek al → uygulamayı sil → yeniden kur → geri yükle
- [ ] "Tüm verileri sil" sonrası uygulama sıfırdan açılıyor
- [ ] Android geri tuşu tüm ekranlarda beklendiği gibi çalışıyor
- [ ] Sistem yazı boyutu en büyükte: taşma yok
- [ ] VoiceOver / TalkBack ile ana akış tamamlanabiliyor
- [ ] Yeni native modüller (`expo-widgets`, `@expo/ui`, `expo-system-ui`, `react-native-svg`, `react-native-view-shot`, `expo-localization`) için yeni development/production build alındı
- [ ] iOS widget: ana ekrana eklenince ağaç ve günün kişisi görünüyor; uygulama kilidi açıkken isim görünmüyor
- [ ] Koyu mod: telefon koyu moddayken tüm ekranlar okunaklı (özellikle Kartvizit, İçgörüler, modallar)
- [ ] Titreşim: "Görüştüm", kart kaydırma ve sekmelerde hissediliyor; Profil'den kapatınca duruyor
- [ ] Anonim istatistik: PostHog anahtarı tanımlıyken ilk kişiden sonra izin sorusu bir kez çıkıyor; "Hayır" denince istek gitmiyor
- [ ] İzin pencereleri: telefon İngilizceyken İngilizce, Türkçeyken Türkçe
- [ ] Telefon dili İngilizce ve Türkçe iken metinler doğru; Profil → Dil seçimi anında değişiyor
- [ ] Aylık hikâye görsel olarak paylaşılıyor (iOS paylaşım menüsü / Android)
- [ ] Karıştır ekranında sağa/sola/yukarı kaydırma; mesaj uygulamasından dönünce "Görüştün mü?" soruluyor, otomatik kayıt yok
- [ ] Küçük ekran (iPhone SE / 5 inç Android) ve tablet görünümü

## Güvenlik doğrulaması (cihazda)
- [ ] Android: `adb shell run-as com.tugceulucn.personalCRM` ile AsyncStorage değerlerinin `enc1:` önekiyle başladığını kontrol et
- [ ] Android: `adb backup` ile yedek alınamıyor
- [ ] Release APK üzerinde MobSF statik analizi
- [x] Manifest: yalnızca gerekli izinler var; `allowBackup=false`; özel URL şeması yok

## Mağaza ve yasal
- [ ] Gizlilik politikası ve kullanım şartları hukukçu onaylı (metinler hazır: uygulama içi + `docs/`)
- [ ] `docs/` GitHub Pages'te yayında; gizlilik URL'si mağazalara girildi
- [ ] App Store "App Privacy" ve Google Play "Data safety" formları `STORE_LISTING.md`'deki cevaplarla dolduruldu
- [x] Rehber ve Face ID izin metinleri Türkçe + İngilizce (`locales/`)
- [ ] Marka rengi kontrast değişikliği ürün sahibi tarafından onaylandı
- [x] Mağaza ekran görüntüleri yeni arayüzle hazır (`store/screenshots/`); cihaz görüntüleriyle karşılaştır
- [ ] Mağaza metinleri ve anahtar kelimeler girildi (`STORE_LISTING.md`)
- [ ] PostHog (EU) projesi, "Discard client IP data" açık, `EXPO_PUBLIC_POSTHOG_KEY` EAS'te tanımlı
- [ ] Sürüm numarası ve `eas.json` production profili

## Sürüm kararı
Şu anki durum: **READY FOR LIMITED TESTING.**

"READY FOR PRODUCTION" için cihaz testleri ve güvenlik doğrulaması bölümlerinin tamamı işaretlenmiş olmalı.
