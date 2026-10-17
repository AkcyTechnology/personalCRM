# Sürüm Kontrol Listesi

**İşaretler:** [x] doğrulandı (kanıtı TEST_RESULTS.md'de) · [ ] yapılacak

## Kod ve otomasyon
- [x] `npx tsc --noEmit` → 0 hata
- [x] `npx eslint .` → 0 sorun
- [x] `npx jest --ci` → 41/41 geçti
- [x] `node e2e/web-smoke.js` → 29/29 geçti
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
- [ ] Küçük ekran (iPhone SE / 5 inç Android) ve tablet görünümü

## Güvenlik doğrulaması (cihazda)
- [ ] Android: `adb shell run-as com.tugceulucn.personalCRM` ile AsyncStorage değerlerinin `enc1:` önekiyle başladığını kontrol et
- [ ] Android: `adb backup` ile yedek alınamıyor
- [ ] Release APK üzerinde MobSF statik analizi
- [x] Manifest: yalnızca gerekli izinler var; `allowBackup=false`; özel URL şeması yok

## Mağaza ve yasal
- [ ] Gizlilik politikası ve kullanım şartları hukukçu onaylı ve herkese açık bir URL'de
- [ ] App Store "App Privacy" ve Google Play "Data safety" formları: veri toplanmıyor, cihazda saklanıyor
- [ ] Rehber izni ve Face ID açıklama metinleri gözden geçirildi (`app.json`)
- [ ] Marka rengi kontrast değişikliği (UX-01) ürün sahibi tarafından onaylandı
- [ ] Mağaza görselleri ve ekran görüntüleri yeni arayüzle güncellendi
- [ ] Sürüm numarası ve `eas.json` production profili

## Sürüm kararı
Şu anki durum: **READY FOR LIMITED TESTING.**

"READY FOR PRODUCTION" için cihaz testleri ve güvenlik doğrulaması bölümlerinin tamamı işaretlenmiş olmalı.
