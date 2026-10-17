# Güvenlik Raporu

Bu rapor iki referansa göre hazırlandı:
- **OWASP MASVS v2 / MASTG** (mobil uygulama güvenliği)
- **OWASP API Security Top 10** (API'si olmadığı için uygulanamaz)

**Test kapsamı ve yöntemi:**
- Yalnızca bu depo ve yerel derlemeler test edildi. Üretim ortamı veya gerçek kullanıcı verisi yok.
- Testlerde tek kullanımlık test verisi kullanıldı (jest'te bellek içi depolama, web'de temiz bir tarayıcı profili).

## Özet

| Alan | Sonuç |
|---|---|
| Kimlik doğrulama ve oturum | **N/A.** Hesap ya da sunucu yok. Yerel erişim kontrolü isteğe bağlı uygulama kilidiyle sağlanıyor |
| API güvenliği (BOLA, IDOR, rate limit, mass assignment…) | **N/A.** Ağ API'si yok. Tek dış veri girişi yedek dosyası; doğrulanıyor (SEC-08) |
| Yerel depolama (MASVS-STORAGE) | ✅ Şifreli; anahtar yalnızca bu cihazda tutuluyor ve yedeklere girmiyor |
| Kriptografi (MASVS-CRYPTO) | ✅ XChaCha20-Poly1305 (`@noble/ciphers`). 256 bit anahtar `expo-crypto` CSPRNG ile üretiliyor. Her yazmada rastgele 192 bit nonce kullanılıyor |
| Platform etkileşimi (MASVS-PLATFORM) | ✅ İzinler en aza indirildi; özel URL şeması yok; WebView yok; dışarıdan açılan linkler doğrulanıyor |
| Ağ (MASVS-NETWORK) | ✅ Uygulama ağa bağlanmıyor. Cleartext trafik yalnızca debug derlemesinde açık (Expo varsayılanı) |
| Kod ve bağımlılıklar (MASVS-CODE) | 🟡 Kritik açık yok. Derleme araçlarında 27 yüksek seviyeli açık var |
| Gizlilik (MASVS-PRIVACY) | ✅ Analitik ve izleme yok; veri silme var; rehber erişimi en az veriyle yapılıyor |
| Sır sızıntısı | ✅ Hem çalışma dizininde hem git geçmişinde temiz |

## Çalıştırılan taramalar

| Araç | Komut | Sonuç |
|---|---|---|
| detect-secrets 1.x | `detect-secrets scan --exclude-files 'package-lock\.json\|node_modules' .` | **0 bulgu** |
| Git geçmişi taraması | `git log -p --all \| grep -Ei "api[_-]?key\|secret\|token\|password\|AIza\|sk_live\|BEGIN .* PRIVATE"` | Gerçek sır yok. Eşleşmeler yalnızca "push token" gibi yorum satırları |
| Hassas dosya geçmişi | `git log --all --name-only \| grep -Ei "\.env\|\.p8\|\.p12\|\.jks\|keystore\|google-services"` | **0** |
| ESLint + eslint-plugin-security | `npx eslint .` | **0 sorun.** 2 ReDoS uyarısı inceledim: sınırlı tekrar içeren düzenli ifadeler, gerçek bir risk değil (gerekçesi kodda yazılı) |
| npm audit | `npm audit --omit=dev` | 40 bulgu (13 moderate, 27 high, **0 critical**). Kritik olan `shell-quote` açığı `npm audit fix` ile giderildi |
| Android manifest | `expo prebuild --platform android` sonrası `AndroidManifest.xml` | Aşağıda |
| Semgrep | `semgrep --config p/react …` | **ÇALIŞTIRILAMADI.** semgrep.dev bu ortamın ağ politikasınca engelli |
| MobSF / APK statik analizi | — | **NOT TESTED.** APK/IPA derlenemedi (Android SDK yok, EAS erişimi yok) |

### Android manifest (prebuild çıktısı, düzeltme sonrası)
- **Etkin izinler:**
  - `INTERNET` (Expo zorunlu kılıyor)
  - `READ_CONTACTS`
  - `USE_BIOMETRIC`
  - `USE_FINGERPRINT`
  - `VIBRATE`
- **Kaldırılan izinler** (`tools:node="remove"`): `WRITE_CONTACTS`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `RECORD_AUDIO`.
- **Diğer ayarlar:**
  - `android:allowBackup="false"`; `dataExtractionRules` ve `fullBackupContent` tanımlı (secure-store).
  - Dışa açık tek bileşen `MainActivity`; yalnızca MAIN/LAUNCHER filtresi var. Özel şema veya app link tanımlı değil.
  - `usesCleartextTraffic="true"` yalnızca `src/debug` ve `src/debugOptimized` manifestlerinde.

## Bulgular

| ID | Önem | Bileşen | Sorun | Kanıt | Düzeltme | Durum |
|---|---|---|---|---|---|---|
| SEC-01 | High | `src/data/contacts.ts`, `userSettings.ts`, kartvizit | Kişisel veriler (ad, telefon, not, doğum günü) AsyncStorage'da düz JSON olarak duruyordu. Root'lu cihazda veya yedekten okunabiliyordu (MASTG-TEST-0001) | Eski kodda `AsyncStorage.setItem(KEY, JSON.stringify(...))` | `secureStorage.ts`: XChaCha20-Poly1305; anahtar `WHEN_UNLOCKED_THIS_DEVICE_ONLY` ile SecureStore'da; eski veri ilk okumada şifrelenerek taşınıyor | ✅ Düzeltildi (unit). Cihaz anahtarlığı NT |
| SEC-02 | Medium | `app.json` | Android otomatik yedeklemesi açıktı | prebuild manifest | `allowBackup: false` | ✅ manifest |
| SEC-03 | Medium | Manifest | Kullanılmayan depolama ve "diğer uygulamaların üzerinde göster" izinleri | prebuild manifest | `blockedPermissions` | ✅ manifest |
| SEC-04 | Medium | Erişim | Telefonu eline alan herkes notları görebiliyordu | — | `AppLock`: açılışta ve 30 sn arka plan sonrasında doğrulama; arka planda kapak; kilidi açıp kapatırken de doğrulama isteniyor | ✅ Kod. Cihazda NT |
| SEC-05 | Medium | `src/utils/links.ts` | `javascript:`, `intent:` ve `file:` gibi şemalar kullanıcı verisinden açılabiliyordu | Eski `Linking.openURL(contact.website)` | Şema izin listesi; host doğrulama; sosyal medya kullanıcı adları kalıba göre kontrol | ✅ unit (`links.test.ts`) |
| SEC-06 | Medium | Veri silme (KVKK md. 11 / GDPR md. 17, App Store 5.1.1(v)) | Silme işlevi çalışmıyordu | — | `wipeAllDataAsync`: AsyncStorage'ı temizliyor, anahtarı ve bildirimleri siliyor | ✅ unit + e2e |
| SEC-07 | Medium | Kayıt ekranı | Doğru olmayan güvenlik iddiası | — | Metin düzeltildi; web için ayrı metin | ✅ |
| SEC-08 | Medium | `src/data/backup.ts` | Güvenilmeyen yedek dosyası içe alınıyordu | — | Biçim/sürüm kontrolü, alan uzunluk sınırları, en fazla 10.000 kayıt, en fazla 20 MB dosya | ✅ unit |
| SEC-09 | Low | Pano | Diğer uygulamalar panodaki mesajı okuyabiliyordu | — | 90 sn sonra temizleniyor | ✅ |
| SEC-10 | Low | Dışa aktarma | Şifresiz geçici dosya cihazda kalıyordu | — | `finally` içinde siliniyor | ✅ |
| SEC-11 | High | Bağımlılık ağacı | Expo CLI, Metro ve jest araç zincirinde (`node-forge`, `micromatch`, `braces`, `@xmldom/xmldom`…) yüksek seviyeli açıklar. Bunlar uygulama paketine girmiyor | `npm audit --omit=dev` | Kritik olan `shell-quote` giderildi. CI'da `--audit-level=critical` engeli var; Dependabot kuruldu | 🟡 Açık: ancak Expo SDK yükseltmesiyle kapanıyor |
| SEC-12 | Low | Bildirimler | Kilit ekranında hassas veri görünme riski | — | Bildirimde yalnızca isim var; not ve telefon yok | ✅ unit |
| SEC-13 | Low | Loglar | Loglarda kişisel veri | `grep console.` | Yalnızca hata nesneleri `console.warn` ile yazılıyor; kişi verisi loglanmıyor | ✅ manual |
| SEC-14 | Low | Web derlemesi | Web'de anahtarlık olmadığı için veri şifresiz | — | Uygulama içinde açıkça belirtiliyor | ❌ Kabul edildi |
| SEC-15 | Low | Yedek dosyası | `.json` yedek şifresiz | — | Kullanıcı uyarılıyor | ❌ Öneri: parolalı yedek |
| SEC-16 | Info | Push bildirimleri | Uzak push token'ı kullanılıyor mu? | — | Kaldırıldı; yalnızca yerel bildirim var | ✅ |
| SEC-17 | Info | CI | Sır yönetimi | `.github/workflows/ci.yml` | CI hiç sır kullanmıyor; izin seviyesi `contents: read` | ✅ |

## Üretim öncesi zorunlu güvenlik kontrolleri

1. **Cihaz kontrolleri:**
   - Android'de `adb backup` alınamadığını ve `/data/data/<pkg>/` altındaki AsyncStorage değerlerinin `enc1:` önekiyle başladığını doğrula.
   - iOS'ta yedekten geri yüklemede anahtarın taşınmadığını doğrula.
2. **Statik analiz:** Release APK/IPA üzerinde MobSF çalıştır.
3. **Bağımlılıklar:** Expo SDK güncellemeleriyle `npm audit` sonuçlarını yeniden değerlendir.
4. **Backend gelirse:** Senkronizasyon veya hesap eklenirse bu rapor yeniden yapılmalı. RLS, BOLA ve oturum testleri o zaman zorunlu hâle gelir.
