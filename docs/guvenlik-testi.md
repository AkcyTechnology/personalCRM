# Güvenlik testi (uygulama içi saldırı denemeleri)

Tarih: Kasım 2026 · Kapsam: mobil uygulamanın kodu ve veri girişleri. Cihaz üzerinde dinamik test (root/jailbreak, ağ trafiği dinleme, ters mühendislik) bu turun kapsamı dışında.

## Saldırı yüzeyi

Uygulamanın sunucusu yok; veriler cihazda şifreli tutulur. Dışarıdan veri girebilen noktalar:

| Giriş | Kimden gelebilir | Durum |
|---|---|---|
| Yedek dosyası içe aktarma | Birinin gönderdiği .json | **Açıklar bulundu, kapatıldı** |
| Şifreli yedek | Birinin gönderdiği dosya | KDF sınırları zaten vardı, test eklendi |
| Telefon rehberi | Paylaşılan rehber kartları | Uzunluk/kontrol karakteri sınırı eklendi |
| Kişi kartındaki linkler | Kişi verisi | Host doğrulaması güçlendirildi |
| Kartvizit QR (vCard) | Kendi profil bilgin | Satır enjeksiyonu engellendi, UTF-8 düzeltildi |
| Derin link (URL ile açılma) | — | Yok (uygulama dışarıdan URL ile işlem başlatmıyor) |
| Bildirimler | Yalnızca uygulamanın kendi yerel bildirimleri | Uzak bildirim yok |

## Bulunan ve kapatılan açıklar

1. **Kalıcı çökme (DoS) — Yüksek.** Yanlış türde alan içeren bir yedek (ör. `createdAt: 123`, `2026-11-xx` tarihi) kaydediliyordu; ana sayfa/profil hesaplamaları her açılışta çöküyordu. → Yedek artık alan alan doğrulanıyor (`src/data/sanitize.ts`); tüm ekran hesaplamaları kötü veriyle test ediliyor.
2. **Ayar ele geçirme — Yüksek (gizlilik).** Yedek dosyası, kullanıcının onayı olmadan anonim analitiği açabiliyor; değer aralığı dışındaki ayarları (bildirim saati 99, hedef −5) yazabiliyordu. → Analitik, uygulama kilidi, koşul onayı ve tanıtım durumu artık asla dosyadan alınmıyor; diğer ayarlar beyaz listeyle ve aralık kontrolüyle alınıyor.
3. **Toplu atama — Orta.** Dosyadaki bilinmeyen alanlar (ör. dışarıdan resim çeken `photoUri`) kişiye aynen kopyalanıyordu. → Sadece bilinen alanlar alınıyor.
4. **Sınırsız liste — Orta.** Bir kişiye 50.000 görüşme yazılabiliyordu (donma). → Görüşme 5.000, hatırlatıcı 200, özel gün 50, kişi 10.000 ile sınırlı.
5. **Tekrarlanan kimlik — Düşük.** Aynı `id` iki kişide olabiliyordu. → Tekrarlananlara yeni kimlik veriliyor; kimlik biçimi doğrulanıyor.
6. **Zayıf link doğrulaması — Düşük.** `https://../../evil` gibi geçersiz adresler web linki sayılıyordu. → Alan adı etiket etiket doğrulanıyor.
7. **Kilit ekranı erişilebilirlik sızıntısı — Orta.** Kilit açıkken ekran okuyucu arkadaki içeriği okuyabiliyordu. → Kilitliyken içerik erişilebilirlik ağacından gizleniyor.
8. **Kilidin açık kalması (fail-open) — Orta.** Biyometrik modül yüklenemezse kilit "başarılı" sayılıyordu. → Telefonda kilit artık kapalı kalıyor.
9. **QR kodda Türkçe karakter bozulması — İşlevsel/güvenilirlik.** → UTF-8 ile kodlanıyor, ekrandan çözülerek doğrulandı.

## Olduğu gibi sağlam bulunanlar

- Cihazda şifreleme: XChaCha20-Poly1305, rastgele 24 baytlık nonce; anahtar iOS Keychain / Android Keystore'da `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, cihaz yedeğine geçmez. Android `allowBackup: false`.
- Şifreli yedek: scrypt (N=2^15, r=8, p=1), başlık AEAD ile bağlı; dosyadaki KDF değerleri sınırlı (2^30 gibi değerler reddediliyor).
- Analitik isteğe bağlı ve kişi verisi içermiyor; pano 90 sn sonra temizleniyor.
- Kodda gömülü anahtar yok; `eval`/HTML enjeksiyonu yok; tüm dış linkler tek bir doğrulanmış noktadan açılıyor.

## Kalan riskler

- **Web sürümü** verileri tarayıcıda şifresiz tutar (anahtar deposu yok). Gerçek veri için mobil uygulama kullanılmalı.
- **Bağımlılık taraması:** derleme aracındaki `minimatch` için 3 orta seviye uyarı; uygulama paketine girmiyor.
- **Cihaz üzerinde dinamik test yapılmadı:** root/jailbreak'li cihazda bellek inceleme, ekran kaydı, APK ters mühendislik. Yayın öncesi bir mobil sızma testi (MASVS kontrol listesiyle) önerilir.

## Testler

`__tests__/security.test.ts` (kötü niyetli yedekler, ayar ele geçirme, KDF, link enjeksiyonu), `__tests__/vcard.test.ts` (QR çözme, vCard enjeksiyonu). Yerel Semgrep kural taraması: tek bulgu linklerin ortak açılış fonksiyonu, tüm çağıranlar doğrulanmış.
