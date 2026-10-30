# Connectly — Uygulama Denetim Raporu

**Tarih:** 17 Ekim 2026 · **Dal:** `claude/tender-bohr-2goaix` · **Kapsam:** depo içindeki mobil uygulamanın tamamı

Bu rapor iki düzeltme turunu kapsıyor:
- **1. tur:** commit `5224a4d`
- **2. tur:** bu denetim

Her bulgunun kanıtı ve doğrulama sonucu tablodadır. Komut çıktılarının ayrıntısı [TEST_RESULTS.md](TEST_RESULTS.md) dosyasında.

**Sonuç:** 🟡 **READY FOR LIMITED TESTING** (gerekçesi en altta)

---

## 1. Keşif (Faz 1)

### Teknoloji yığını

| Katman | Kullanılan |
|---|---|
| Çatı | Expo SDK 57.0.18, React Native 0.86.3, React 19.2.3, TypeScript 6.0 |
| Navigasyon | `@react-navigation/native-stack` 7. Alt sekmeler özel bir bileşen (`MainTabs` + `BottomTabBar`) |
| Depolama | `AsyncStorage`, üzerinde XChaCha20-Poly1305 şifreleme katmanı (`src/storage/secureStorage.ts`). Şifreleme anahtarı `expo-secure-store` içinde |
| Yerel modüller | expo-contacts, expo-notifications, expo-local-authentication, expo-secure-store, expo-crypto, expo-file-system, expo-sharing, expo-document-picker, expo-clipboard, expo-haptics, datetimepicker |
| **Backend / API / Veritabanı** | **Yok.** Ağ çağrısı yapılmıyor; uygulama tamamen cihazda çalışıyor. Supabase ve başka bir servis kullanılmıyor |
| Kimlik doğrulama | **Yok.** Tek yerel kullanıcı, misafir akışı |
| Üçüncü taraf entegrasyonlar | Yalnızca işletim sistemi linkleri: `tel:`, `mailto:`, `https://wa.me` |

### Ekranlar ve rotalar (17)

- **Tanıtım ve giriş:** Onboarding (tanıtım slaytları), SignUp (karşılama ve yasal onay), Welcome, OnboardingFlow (3 adım).
- **Sekmeler (MainTabs):** Home, People, Insights, Profile.
- **Kişi ekranları:** AddContact, ImportContacts, People (stack üzerinden açılan, filtreli sürüm), Reminders, PersonDetail.
- **Ayarlar ve diğerleri:** ProfileSettings, NotificationSettings, PrivacySecurity, ManageSubscription, BusinessCard, Legal (gizlilik politikası ve kullanım şartları).

### Kaldırılan ölü kod
1. turda kaldırıldı:
- `SignInScreen` (boş taslak)
- `AuthNavigator.tsx` (boş dosya)
- `insightsData.json` (kullanılmayan sahte veri)
- Sahte "Yakında" butonları ve sahte Premium ekranı

### Mevcut işaretler
- TODO/FIXME: yok (`grep -rnE "TODO|FIXME|XXX|HACK"` → 0 sonuç).
- Çalışmayan import: yok (`tsc` 0 hata; 3 platformun paketi derleniyor).

### Ön yüz ile arka uç karşılaştırması
Backend olmadığı için ön yüzde görünen her işlem yerel veri katmanına bağlanıyor (`src/data/*`). 2. turdan sonra arayüzde hesap, ödeme ya da bulut eşitlemesi vaat eden bir öğe kalmadı.

## 2. Faz özetleri

| Faz | Durum |
|---|---|
| 2. Ön yüz işlev testi | Web derlemesinde Playwright ile uçtan uca test: **48/48 adım geçti** (Türkçe + İngilizce + koyu tema). Gerçek cihaz/emülatör yok → **NOT TESTED** |
| 3. UI tasarım denetimi | Ayrıntılar [UI_UX_REVIEW.md](UI_UX_REVIEW.md) dosyasında |
| 4. UX kullanılabilirlik denetimi | Ayrıntılar [UI_UX_REVIEW.md](UI_UX_REVIEW.md) dosyasında |
| 5. Backend ve veritabanı | **N/A:** backend, API, veritabanı, RLS ve rol yapısı yok. Kullanıcılar arası izolasyon testi uygulanamaz (tek yerel kullanıcı) |
| 6. Siber güvenlik | Ayrıntılar [SECURITY_REPORT.md](SECURITY_REPORT.md) dosyasında |
| 7. Performans | Aşağıdaki PERF bulguları |
| 8. Otomatik testler | Ayrıntılar [TEST_RESULTS.md](TEST_RESULTS.md) dosyasında |
| 9. Düzeltme ve regresyon | Her düzeltmeden sonra `tsc`, `eslint` ve `jest` yeniden çalıştırıldı; uçtan uca test son derlemede tekrarlandı |

## 3. Birleşik bulgu tablosu

**Kısaltmalar:**
- **Kategori:** SEC = güvenlik, FUN = işlev, UX = kullanılabilirlik/tasarım, PERF = performans, QA = test/araç, BE = backend.
- **Fix applied:** ✅ düzeltildi · 🟡 kısmen düzeltildi · ❌ açık.
- **Verification result:** **unit** = jest testi, **e2e** = Playwright testi, **manifest** = prebuild çıktısında kontrol, **build** = derleme ve paket boyutu ölçümü, **manual** = kod incelemesi, **NT** = test edilmedi.

| Finding ID | Category | Severity | Affected file / feature | Problem description | Evidence | Fix applied | Verification result | Remaining risk |
|---|---|---|---|---|---|---|---|---|
| SEC-01 | SEC | High | `src/data/*` | Kişiler, notlar ve ayarlar AsyncStorage'da düz metin tutuluyordu | 1. turdan önceki `contacts.ts` kodu | ✅ XChaCha20-Poly1305 şifreleme; anahtar Keychain/Keystore'da, yalnızca bu cihazda | unit: `storage.test.ts` (diskte `enc1:` öneki, değiştirilmiş veri reddediliyor, eski veri taşınıyor) | Cihazda NT |
| SEC-02 | SEC | Medium | `app.json` | Android `allowBackup` açıktı | prebuild çıktısındaki manifest | ✅ `allowBackup=false` | manifest | — |
| SEC-03 | SEC | Medium | Android manifest | Gereksiz izinler: READ/WRITE_EXTERNAL_STORAGE, SYSTEM_ALERT_WINDOW | prebuild manifest satır 4–5, 10 | ✅ `blockedPermissions` (`tools:node="remove"`) | manifest | — |
| SEC-04 | SEC | Medium | Uygulama geneli | Uygulama kilidi yoktu | — | ✅ Biyometri veya cihaz şifresi; arka planda içeriği gizleyen kapak | manual; cihazda NT | Cihazda NT |
| SEC-05 | SEC | Medium | Linkler | Kullanıcı girdisi doğrulanmadan `Linking.openURL`'e veriliyordu | eski `PersonDetailScreen` | ✅ Yalnızca http(s), `tel` ve `mailto` açılıyor | unit: `links.test.ts` (`javascript:`, `file:`, `intent:` engelleniyor) | — |
| SEC-06 | SEC | Medium | Hesap silme | "Sil" butonu hiçbir şey yapmıyordu | eski `PrivacySecurityScreen.tsx:65` | ✅ Tüm verileri silme, iki aşamalı onay | unit: `backup.test.ts`; e2e: "wipe all data" | — |
| SEC-07 | SEC | Medium | Kayıt ekranı | "Verilerin şifrelenir" yazısı doğru değildi | eski `SignUpScreen` | ✅ Metin artık gerçeği yansıtıyor; web için ayrı metin | manual | — |
| SEC-08 | SEC | Medium | Yedekten geri yükleme | Güvenilmeyen JSON dosyası doğrulanmadan içe alınıyordu | — | ✅ `parseBackup`: biçim ve sürüm kontrolü, alan uzunluğu ve kayıt sayısı sınırı | unit: `storage.test.ts`, `backup.test.ts` | — |
| SEC-09 | SEC | Low | Pano | Kopyalanan mesaj panoda kalıyordu | — | ✅ 90 sn sonra panodan temizleniyor | manual | iOS'ta pano koşulsuz temizleniyor |
| SEC-10 | SEC | Low | Dışa aktarma | Geçici dosya cihazda kalıyordu | — | ✅ Paylaşımdan sonra siliniyor | manual | — |
| SEC-11 | SEC | High | Bağımlılıklar | `npm audit`: 1 critical (shell-quote) + derleme araçlarında yüksek seviyeli açıklar | `npm audit --omit=dev` | 🟡 Critical giderildi; **27 high + 13 moderate kaldı** (Expo/Metro derleme araçları, uygulamaya girmiyor) | audit çıktısı | Yeni Expo SDK'sı bekleniyor |
| SEC-12 | SEC | Info | Depo ve git geçmişi | Sabit yazılmış sır taraması | detect-secrets: 0 bulgu; git geçmişinde grep: 0 bulgu | — | ✅ Temiz | — |
| SEC-13 | SEC | Info | Ağ ve derin linkler | Cleartext trafik, özel URL şeması, dışa açık bileşenler | manifest: cleartext yalnızca debug'da; özel şema yok; yalnızca LAUNCHER aktivitesi dışa açık | — | ✅ Geçti | — |
| SEC-14 | SEC | Low | Bildirimler | Bildirim içeriğinde hassas veri sızıntısı | — | ✅ Bildirimlerde not ve telefon yok | unit: `notifications.test.ts` | — |
| SEC-15 | SEC | Low | Web sürümü | Web'de veriler şifresiz (anahtarlık yok) | `secureStorage.ts` | ❌ Kabul edildi, uygulama içinde belirtiliyor | manual | Web yalnızca demo amaçlı |
| SEC-16 | SEC | Low | Yedek dosyası | `.json` yedek şifresiz | — | ❌ Kullanıcı uyarılıyor | manual | Parolalı yedek önerilir |
| FUN-01 | FUN | High | Rehberden kişi seçme | Statik `expo-contacts` importu, modül eksikse uygulamayı çökertiyordu | Kullanıcının hata bildirimi | ✅ Gecikmeli yükleme + anlaşılır mesaj; iOS'ta sistem seçicisi | build (3 platform) | Cihazda NT |
| FUN-02 | FUN | High | Bildirimler | Hiç bildirim zamanlanmıyordu | — | ✅ Takip, doğum günü, haftalık özet ve öneri; "Görüştüm" aksiyonu | unit: `reminderPlan`, `notifications` | Teslim NT (cihaz yok) |
| FUN-03 | FUN | High | Silme / düzenleme | Ad + e-posta eşleşmesi aynı isimli kişileri de siliyordu (veri kaybı) | — | ✅ Yalnızca kimlikle (id) eşleşme | unit: "identical names" testi | — |
| FUN-04 | FUN | High | Dışa aktarma | SDK 57'de eski API çalışma anında hata fırlatıyordu | `legacyWarnings.d.ts` | ✅ Yeni `File` / `Paths` API'si | build | Cihazda NT |
| FUN-05 | FUN | Medium | Ana sayfa | "Bugün 4 kişiyle" yazısı sabit yazılmıştı | eski `HomeScreen.tsx:476` | ✅ Gerçek sayı gösteriliyor | e2e: "dynamic due count" | — |
| FUN-06 | FUN | Medium | Kişiler | Ana sayfadaki "Tümünü gör" filtre gönderiyordu, Kişiler ekranı yok sayıyordu | `route.params` okunmuyordu | ✅ Durum filtreleri ve rota parametresi | e2e: "status filter" | — |
| FUN-07 | FUN | Medium | Bildirim balonu (toast) | Eski balonun kaybolma animasyonu yeni balonu da siliyordu (yarış durumu) | e2e testinde ilk koşuda yakalandı | ✅ Her balona kimlik verildi; eski animasyon durduruluyor | e2e: "undo toast shown" | — |
| FUN-08 | FUN | Medium | Web onay pencereleri | `Alert.alert` web'de çalışmıyor → mükerrer kişi uyarısı, veri silme ve geri yükleme işlemsiz kalıyordu | react-native-web davranışı | ✅ `confirmDialog` (web'de `window.confirm`) | e2e: "duplicate", "wipe" | — |
| FUN-09 | FUN | Medium | Kişi ekleme | "Aile/hediye notları" kutusuna yazılanlar kaydedilmiyordu | `value`/`onChange` bağlı değildi | ✅ Notlar alanıyla birleştirildi | manual | — |
| FUN-10 | FUN | Medium | Kişi ekleme | LinkedIn / Instagram bilgileri hiçbir yerde görünmüyordu | `socials` alanına yazılmıyordu | ✅ Kaydederken `socials` dolduruluyor | manual | — |
| FUN-11 | FUN | Low | Kişi ekleme | Son görüşme bilinmiyorsa "bugün" kabul ediliyordu (yanlış sağlık skoru) | — | ✅ Boş bırakılıyor; hatırlatma aralığı bugünden başlıyor | e2e | — |
| FUN-12 | FUN | Low | Erteleme | Geçmiş tarih kabul ediliyordu; tarih elle yazılıyordu; UTC kayması vardı | eski `SnoozeModal` | ✅ Tarih seçici; en erken yarın; yerel tarih | manual | — |
| FUN-13 | FUN | Medium | Kişi ekleme | Kaydet'e art arda basınca mükerrer kayıt oluşabiliyordu | — | ✅ `saving` kilidi | manual | — |
| FUN-14 | FUN | Low | Kişi ekleme | Mükerrer kişi uyarısı yoktu | — | ✅ Uyarı ve onay | e2e | — |
| FUN-15 | FUN | Low | Kişiler | Web'de arama temizleme butonu taşıyordu | e2e ekran görüntüsü | ✅ `minWidth: 0` + ikon | e2e: "search" | — |
| FUN-16 | FUN | Low | Kişiler | İlişki filtresi sabit listeydi; özel ilişki türleri görünmüyordu | — | ✅ Liste kişilerden türetiliyor | manual | — |
| FUN-17 | FUN | Low | Ana sayfa / Kişiler | Yükleme sırasında bir an "boş" ekran görünüyordu | — | ✅ İskelet görünüm | e2e | — |
| FUN-18 | FUN | Medium | WhatsApp | `0532…` numaraları ülke kodu olmadan açılıyordu | — | ✅ Türkiye numaralarına 90 ekleniyor | unit | — |
| FUN-19 | FUN | Low | Çeşitli | Profil'deki içe aktarma yanlış ekrana gidiyordu; "Özel tarih" yazı olarak kaydediliyordu; "Tuğçe" adı sabitti; ilk kurulumda sahte kişiler vardı | 1. tur | ✅ | e2e / manual | — |
| UX-01 | UX | High | Tema | Marka turkuazı (#00B5AC) beyaz zeminde 2.56:1; WCAG 1.4.3 için 4.5:1 gerekiyor | Kontrast hesabı | ✅ `primary` #00857E (4.51:1). Eski renk yalnızca süs amaçlı `brand` token'ında | manual (hesap) | Görsel değişiklik — onay gerekli |
| UX-02 | UX | Medium | Tema | `textMuted` 2.54:1 | Kontrast hesabı | ✅ #6E7581 (4.52:1) | manual | Eski sabit renklerin bir kısmı kaldı |
| UX-03 | UX | Medium | Sağlık skoru | Tek bir gecikmiş kişi skoru 0 yapıyordu; tarihi olmayan kişiler de skoru düşürüyordu | Ekran görüntüsü | ✅ Yumuşak formül; tarihi olmayanlar hesaba katılmıyor | unit: `healthScore.test.ts` | — |
| UX-04 | UX | Medium | Ana sayfa başlığı | "Kart" ve "!" butonları anlaşılmıyordu | — | ✅ İkon, okunmamış rozeti ve erişilebilirlik etiketi | e2e: "bell badge label" | — |
| UX-05 | UX | Medium | Ana sayfa | "Mesaj" etiketi buton gibi görünüyordu ama değildi | — | ✅ Kaldırıldı; işlemler açık butonlara taşındı | manual | — |
| UX-06 | UX | Medium | Kişi ekleme | Form çok uzundu; zorunlu alanlar belli değildi | — | ✅ Önce temel alanlar, gerisi "Daha fazla" altında; `*` işareti, alan altında hata mesajı | e2e: "validation" | — |
| UX-07 | UX | Medium | Geri alma | Yıkıcı ya da yanlışlıkla yapılan işlemler geri alınamıyordu | — | ✅ "Geri al" balonu: silme, toplu silme, "Görüştüm", erteleme, görüşme kaydı silme | e2e: "undo", "delete + undo" | — |
| UX-08 | UX | Medium | Kişiler | Kaydırarak işlem yoktu; filtreleme zayıftı | — | ✅ Kaydırınca "Görüştüm"/"Ertele"; durum filtreleri; "en uzun süredir görüşülmeyen" sıralaması | e2e (filtre); kaydırma NT | Kaydırma cihazda NT |
| UX-09 | UX | Medium | Stil | 249 sabit renk kodu | grep sayımı | ✅ Token'lara bağlandı | `tsc` | — |
| UX-10 | UX | Low | İkonlar | Emoji ve metin karakterleriyle yapılmış ikonlar | grep | ✅ Ionicons | manual | Onboarding emojileri duruyor |
| UX-11 | UX | Medium | Erişilebilirlik | `accessibilityLabel` hiç kullanılmıyordu | grep: 0 | 🟡 Ana akışlara eklendi | e2e etiketlerle çalışıyor | Insights grafikleri ve BusinessCard kısmen |
| UX-12 | UX | Medium | Karanlık mod | Desteklenmiyor | `userInterfaceStyle: light` | ❌ | — | Açık |
| UX-13 | UX | Low | Bileşenler | Ortak bileşen yok; dev ekran dosyaları | `wc -l` | 🟡 Avatar, EmptyState, DateField, Toast, LogInteractionModal | — | Ekranlar hâlâ büyük |
| UX-14 | UX | Low | Yazı boyutu | Sistem yazı boyutu büyütülünce taşma kontrolü | — | ❌ | NT | Cihazda test edilmeli |
| UX-15 | UX | Low | Ana sayfa / İçgörüler | Ekranlar çok metin ağırlıklıydı | Ekran görüntüleri | ✅ Kısa etiketler, rozetler, yatay kartlar; İçgörüler'de tekrarlar azaltıldı | e2e ekran görüntüleri | — |
| PERF-01 | PERF | Medium | Paket boyutu | Tüm ikon fontları (~4 MB) pakete giriyordu | `expo export` | ✅ Yalnızca Ionicons: 9.8 MB → 5.9 MB; Hermes paketi 4.1 → 3.8 MB | build | — |
| PERF-02 | PERF | Low | Hatırlatıcılar | Her yazmada tüm bildirimler yeniden planlanıyordu | — | ✅ 600 ms gecikmeli birleştirme | manual | — |
| PERF-03 | PERF | Medium | Depolama | Her yazmada tüm veri yeniden şifreleniyor | Node ölçümü: 1 MB → şifreleme 94 ms / çözme 42 ms | ❌ | Hermes'te NT | Çok büyük veri setinde gecikme olabilir |
| PERF-04 | PERF | Low | Görseller | Onboarding PNG'leri toplam 2.6 MB | `ls -la assets` | ❌ | — | Paket boyutu |
| QA-01 | QA | Medium | Araçlar | Lint ve statik analiz yoktu | — | ✅ ESLint (typescript-eslint, security, react-hooks) + CI | `eslint`: 0 sorun | Semgrep kural sunucusu bu ortamda engelli |
| QA-02 | QA | Medium | Testler | Hiç test yoktu | — | ✅ 41 birim/entegrasyon testi + 29 adımlık e2e testi; Maestro akışı yazıldı | jest / e2e | Maestro NT |
| BE-01 | BE | Info | Backend | Backend, API, veritabanı ve RLS yok | Kod taraması | — | N/A | Eşitleme gelirse yeniden denetlenmeli |

## 4. Sürüm kararı

### 🟡 READY FOR LIMITED TESTING

**Neden "READY FOR PRODUCTION" değil:**
1. **Gerçek cihaz testleri yapılmadı (NOT TESTED).** Bu ortamda emülatör ya da cihaz yok. Şunlar doğrulanmadı:
   - Bildirimlerin cihaza gelmesi
   - Face ID / parmak izi
   - Rehber seçici
   - Keychain/Keystore şifrelemesi
   - Kaydırma hareketleri
   - Haptik geri bildirim
   - Büyük yazı boyutu
2. **Bağımlılık açıkları kaldı:** derleme araçlarında 27 yüksek seviyeli açık (SEC-11).
3. **Yasal metinler bir hukukçu tarafından incelenmedi.**
4. **Renk kontrastı düzeltmesi marka rengini koyulaştırdı** ve ürün sahibinin onayı bekleniyor (UX-01).

Bir sonraki adım için [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) dosyasına bakın.
