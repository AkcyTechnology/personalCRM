# Test Sonuçları

**Ortam:**
- Linux bulut konteyneri, Node v22.22.0, npm 10.9.4
- Chromium (Playwright 1.x, `/opt/pw-browsers/chromium`)
- **Android emülatörü, iOS simülatörü ve fiziksel cihaz YOK**

Aşağıdaki sonuçların hepsi gerçekten çalıştırılan komutların çıktısından alındı. Sadece kod okunarak "geçti" denen bir sonuç yok.

## 1. Statik kontroller

| Kontrol | Komut | Sonuç |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | ✅ 0 hata |
| ESLint (typescript-eslint + security + react-hooks) | `npx eslint .` | ✅ 0 sorun |
| Sır taraması | `detect-secrets scan …` | ✅ 0 bulgu |
| Bağımlılık taraması | `npm audit --omit=dev` | ⚠️ 40 açık (13 moderate, 27 high, 0 critical). Ayrıntılar SECURITY_REPORT.md içinde |

## 2. Birim ve entegrasyon testleri (Jest, `jest-expo` preset)

Komut: `npx jest --ci`

```
Test Suites: 13 passed, 13 total
Tests:       76 passed, 76 total
```

| Dosya | Kapsam |
|---|---|
| `__tests__/storage.test.ts` | Şifreleme: gidiş-dönüş, değiştirilmiş veriyi reddetme, diskte `enc1:` öneki, eski düz metin verinin taşınması. Kişi CRUD: aynı isimli iki kişiden yalnızca hedefin güncellenmesi/silinmesi. `markContacted` geçmiş kaydı. Yedek dosyası doğrulama |
| `__tests__/backup.test.ts` | Yedekte uygulama kilidi ayarının dışarı aktarılmaması; birleştirme ve değiştirme ile geri yükleme; geri yüklemede cihazdaki kilit ayarının korunması; tüm verileri silme |
| `__tests__/notifications.test.ts` | `expo-notifications` mock'uyla: tüm bildirimleri iptal edip yeniden planlama; kategori, `contactId` ve tetikleyici türleri; izin yoksa hiçbir şey planlamama; bildirimde not/telefon olmaması |
| `__tests__/reminderPlan.test.ts` | Takip tarihi, gecikmiş kişi için ertesi sabah, erteleme, kapalı hatırlatıcı, kategori ayarları, iOS'un 64 bildirim sınırı |
| `__tests__/healthScore.test.ts` | Yeni skor formülü; tarihi olmayan kişilerin hesaba katılmaması; ertelenenlerin "yolunda" sayılması |
| `__tests__/links.test.ts` | WhatsApp numarası normalleştirme; tehlikeli şemaların (`javascript:`, `file:`, `intent:`) engellenmesi; sosyal profil adresleri |
| `__tests__/dates.test.ts` | Yerel tarih (UTC kayması olmadan), doğum günü ayrıştırma, bir sonraki doğum günü |
| `__tests__/duplicateContact.test.ts` | Telefon, e-posta ve isim normalleştirmesiyle mükerrer tespiti |
| `__tests__/engagement.test.ts` | Haftalık seri ve dondurma hakkı, bu haftaki kişiler, Günün kişisi (gün içinde sabit), Bugünün kıvılcımları, "Bugün X yıl önce", aylık hikâye, ilişki yolculuğu |
| `__tests__/backupCrypto.test.ts` | Parolalı yedek: gidiş-dönüş ve içeriğin gizli olması; her seferinde yeni tuz ve nonce; yanlış parola; Unicode normalleştirme; veri ya da başlık değişikliğinin yakalanması; aşırı KDF parametrelerinin işe başlamadan reddi; en az 8 karakter; normal geri yükleme yolundan açılma |
| `__tests__/analytics.test.ts` | Sayıların yuvarlanması; gönderilen paketin kişisiz ve GeoIP'siz olması, olay özelliklerinin bu bayrakları ezememesi; anahtar ya da izin yokken hiçbir istek atılmaması |
| `__tests__/performance.test.ts` | 2.000 kişi × 20 an (~4 MB): Ana sayfa hesapları ~320 ms (önce ~900 ms; önbellek eklendi), aylık hikâye ~10 ms, hatırlatma planı ~85 ms, şifreleme ~0.6 sn, çözme ~1 sn (Node, jest). Hermes'te ölçülmedi |
| `__tests__/i18n.test.ts` | Kaynaktaki her `t("…")` metninin ve kayıtlı sabit değerlerin (ilişki türü, tanışma yeri vb.) İngilizce karşılığı var; `{yer tutucu}` adları korunuyor; çoğul ve parametre işleme |

**Performans ölçümü:** 1000 kişi, ~1 MB veri. Şifreleme 93.6 ms, çözme 41.6 ms (Node V8 JIT, 5 ölçüm ortalaması). Cihazdaki Hermes motorunda **ÖLÇÜLMEDİ**.

## 3. Uçtan uca test (Playwright, web derlemesi)

**Komutlar:**
```
npx expo export --platform web --output-dir <dir>
python3 -m http.server 8765 -d <dir>
CHROMIUM_PATH=/opt/pw-browsers/chromium node e2e/web-smoke.js
```

**Sonuç:** ✅ **48/48 adım geçti** (Türkçe `tr-TR`, İngilizce `en-US` ve koyu tema), çalışma anında hata yok, çıkış kodu 0.

| # | Adım | Sonuç |
|---|---|---|
| 1–7 | Onboarding: tanıtımı atlama, kullanım şartları sayfası, başlangıç, karşılama, profil, hedefler, bitiriş | PASS |
| 8 | Ana sayfa boş durum ekranı | PASS |
| 9–12 | Kişi ekleme: boş kaydetmede doğrulama mesajı, temel alanları doldurma, kaydetme | PASS |
| 13–14 | Ana sayfadaki bekleyen sayısının gerçek veriden gelmesi; zil rozetinin erişilebilirlik etiketi | PASS |
| 15–18 | "Bugün" kartından "Görüştüm" → "Geri al" balonu → geri alma bekleyen durumu geri getiriyor → tekrar kaydetme | PASS |
| 19 | Mükerrer kişi uyarısı (web onayı) ve kaydetme | PASS |
| 20–22 | Kişiler: 2 kişi listeleniyor; "Yeniden bağlan" filtresi; arama ve temizleme | PASS |
| 23–24 | Detay: geçmişte not görünüyor; geri dönüş | PASS |
| 25 | Detaydan silme → "Geri al" → kişi geri geliyor | PASS |
| 26–31 | Evren: bağ haritası ve İçgörüler sekmesi; Aylık hikâye isimler kapalıyken kişi adı göstermiyor; Ana sayfadan Karıştır ekranı açılıp kapanıyor | PASS |
| 32–34 | Gizlilik ekranı; gizlilik politikası; tüm verileri silme (localStorage'da `crm_contacts` kalmıyor, Onboarding açılıyor) | PASS |
| 35–43 | İngilizce: onboarding, kayıt, profil, hedefler, boş ana sayfa, kişi ekleme, sıcak ana sayfa metni, "Universe" sekmesi | PASS |
| 45–47 | Bağ ağacı kartı ve "nasıl büyür" penceresi; Profil'de Görünüm ve Titreşim ayarları; İngilizce "Your bond tree" | PASS |
| 48 | Koyu tema: telefon koyu moddayken uygulama arka planı koyu | PASS |
| 44 | iPhone SE (320 px) genişliğinde yatay taşma yok | PASS |

**Bu testin yakaladığı ve düzeltilen hatalar:**
- **FUN-07:** Bildirim balonundaki yarış durumu.
- **FUN-15:** Arama temizleme butonunun taşması.

## 4. Derleme doğrulaması

| Platform | Komut | Sonuç |
|---|---|---|
| Android (Hermes) | `npx expo export --platform android` | ✅ Çıkış 0. Toplam 5.9 MB (öncesi 9.8 MB); `.hbc` paketi 3.8 MB (öncesi 4.1 MB) |
| iOS (Hermes) | `npx expo export --platform ios` | ✅ Çıkış 0. Toplam 5.9 MB; `.hbc` paketi 3.8 MB |
| Web | `npx expo export --platform web` | ✅ Çıkış 0. Toplam 4.6 MB; JS 2.4 MB |
| Android manifest | `npx expo prebuild --platform android --no-install` (geçici kopyada) | ✅ İzinler ve yedekleme ayarı doğrulandı |
| Yerel APK/IPA | `eas build` / Gradle / Xcode | ❌ **NOT TESTED.** Android SDK, Xcode ve EAS erişimi yok |

## 5. Test edilmeyenler (NOT TESTED)

| Alan | Neden |
|---|---|
| Maestro mobil uçtan uca testi (`.maestro/core-journey.yaml`) | Emülatör/cihaz yok. Akış yazıldı ama çalıştırılmadı |
| Bildirimlerin cihaza gerçekten gelmesi; "Görüştüm" bildirim aksiyonu | Cihaz yok |
| Face ID / parmak izi ile uygulama kilidi | Cihaz yok |
| iOS Keychain / Android Keystore ile anahtar saklama | Cihaz yok (jest'te mock'landı) |
| Rehber seçici ve toplu aktarma | Cihaz yok (web'de rehber modülü yok) |
| Kaydırma hareketi (ReanimatedSwipeable) | Web'de dokunmatik hareket testi yapılmadı |
| Haptik geri bildirim, Android geri tuşu | Cihaz yok |
| Sistem yazı boyutu ve ekran okuyucu (VoiceOver/TalkBack) | Cihaz yok |
| Kötü ağ / çevrimdışı | Uygulama ağ kullanmıyor; test gerekmiyor |
| İki farklı kullanıcıyla veri izolasyonu, API/kimlik doğrulama/veritabanı izin testleri | **N/A:** backend ve hesap sistemi yok; tek yerel kullanıcı |
| Semgrep | Kural sunucusuna erişim engelli |
