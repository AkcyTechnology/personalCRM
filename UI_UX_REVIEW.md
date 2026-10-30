# UI/UX İncelemesi

**Referanslar:** Nielsen'in 10 kullanılabilirlik ilkesi ve WCAG 2.2 AA.

**Yöntem:**
- Web derlemesi Playwright ile iPhone 14 (390×844) ve iPhone SE (320×568) ekran boyutlarında çalıştırıldı.
- Ekran görüntüleri incelendi (`e2e/screenshots/`, git'e eklenmiyor).
- Kod tarandı.

**Test edilemeyenler (NOT TESTED):** Gerçek cihaz, ekran okuyucu (VoiceOver/TalkBack) ve sistem yazı boyutu testleri bu ortamda yapılamadı.

## Yapılan değişiklikler

Marka kimliği korundu (turkuaz + mor vurgu), tasarım dili değiştirilmedi.

### Görsel tutarlılık
- **Renkler tek kaynakta toplandı.** 249 sabit renk kodu `src/theme/colors.ts` içindeki token'lara bağlandı.
- **WCAG 1.4.3 kontrast düzeltmesi:**
  - Marka turkuazı #00B5AC beyaz zeminde **2.56:1** kontrast veriyordu.
  - Metin ve buton zemini için **#00857E (4.51:1)** kullanılıyor. Eski renk `brand` token'ında yalnızca süs amaçlı duruyor.
  - Gri metinler 2.54:1'den 4.52:1'e çıkarıldı.
  - Başarı ve uyarı renkleri 5.0:1'e koyulaştırıldı.
  - ⚠️ Bu değişiklik turkuazı gözle görülür biçimde koyulaştırıyor. Beğenilmezse `colors.primary` değeri tek satırda geri alınabilir, ama o durumda erişilebilirlik testi kalır.
- **İkonlar:** Emoji ve metin karakteriyle yapılmış ikonların (ⓘ, ◎, !, ✕, 🔔, 👥…) yerine Ionicons kullanılıyor.
- **Form alanları:** Hepsi aynı kutulu stilde (48 px yükseklik, 12 px köşe yuvarlaklığı).
- **Ortak bileşenler:** `Avatar` (durum halkalı), `EmptyState` (ikon + birincil/ikincil eylem), `DateField`, `Toast` (eylem butonlu), `LogInteractionModal`.

### Metin yükünü azaltma (kullanıcı isteği)
- **Ana sayfa:**
  - Başlık "Bugün N kişi seni bekliyor" ya da "Bugün her şey yolunda ✓" diyor.
  - Açıklama cümleleri kaldırıldı.
  - Sağlık skorunun yanında "İyi / Dikkat / Zayıf" etiketi ve ilerleme çubuğu var.
  - Ulaşılacak kişiler, durum halkalı avatarlarla **yatay kaydırılan "Bugün" kartlarında** gösteriliyor.
  - Doğum günleri yatay şeritte.
- **İçgörüler:**
  - Bölüm alt başlıkları ve kart açıklamaları kaldırıldı.
  - Skor ekranda üç kez gösteriliyordu; tekrarlar kaldırıldı.
  - "En çok ihmal edilen" bölümü kaldırıldı ("Öncelikli bağlantılar" ile aynı bilgiyi veriyordu).

## Nielsen ilkelerine göre bulgular

| İlke | Bulgu | Durum |
|---|---|---|
| 1. Sistem durumunun görünürlüğü | Yükleme sırasında boş ekran görünüyordu; başlıktaki sayı sabit yazılmıştı; zil ikonunda sayı yoktu | ✅ İskelet görünüm, gerçek sayı, rozet |
| 2. Sistemle gerçek dünya uyumu | "Timeline", "Website" gibi İngilizce kelimeler; "!" butonu | ✅ Türkçe karşılıklar ve zil ikonu |
| 3. Kullanıcı kontrolü ve özgürlük | Silme, "Görüştüm" ve erteleme geri alınamıyordu | ✅ 5 saniyelik "Geri al" balonu |
| 4. Tutarlılık ve standartlar | Farklı alan stilleri, iki ayrı tarih biçimi, 249 sabit renk | ✅ |
| 5. Hata önleme | Mükerrer kişi, çift kayıt, geçmiş tarihe erteleme | ✅ Uyarı, `saving` kilidi, en erken yarın |
| 6. Hatırlamak yerine görmek | Kaydırma ve basılı tutma işlevleri belli değildi | ✅ Erişilebilirlik ipucu ve "basılı tut" açıklaması |
| 7. Esneklik ve verimlilik | Kaydırarak işlem ve durum filtreleri yoktu | ✅ Sola kaydırınca Görüştüm/Ertele; Bekleyen/Yaklaşan/Son görüşülen filtreleri; "en uzun süredir görüşülmeyen" sıralaması |
| 8. Estetik ve sade tasarım | Ekranlar metin ağırlıklıydı | ✅ Ana sayfa ve İçgörüler sadeleştirildi |
| 9. Hataları tanıma ve düzeltme | Kaydet soluk kalıyordu ama nedeni belli değildi | ✅ Kaydet hep aktif; eksik alanın altında kırmızı mesaj + balon |
| 10. Yardım | ⓘ ile sağlık skoru açıklaması | ✅ (mevcuttu, ikonu yenilendi) |

## WCAG 2.2 AA

| Kriter | Durum | Not |
|---|---|---|
| 1.4.3 Kontrast (metin) | 🟡 | Token'lar AA'yı karşılıyor. Bazı eski yerlerde `primary + "55"` gibi saydam tonlar ve onboarding gradyanı (#00A39B üzerinde beyaz ≈ 3.1:1) kaldı |
| 1.4.11 Arayüz bileşeni kontrastı | 🟡 | Kenarlıklar #E5E7EB (1.2:1) dekoratif kullanılıyor. Butonlar zemin rengiyle ayrışıyor |
| 2.5.8 Hedef boyutu (en az 24×24) / önerilen 44×44 | 🟡 | Yeni ve yeniden yazılan öğeler en az 44 px. Eski bazı çipler 40 px |
| 4.1.2 Ad, rol, değer | 🟡 | Ana akışlarda (Ana sayfa, Kişiler, Detay, Hatırlatıcılar, Gizlilik, sekmeler, başlık) etiket, rol ve durum tanımlı. İçgörüler grafikleri, Kartvizit ve Onboarding kısmen |
| 1.4.4 / 1.4.10 Yazı büyütme ve yeniden akış | ❌ NT | Cihazda sistem yazı boyutu testi gerekiyor. iPhone SE genişliğinde yatay taşma yok (e2e) |
| 3.3.1 / 3.3.3 Hata tanımlama ve öneri | ✅ | Hatalı alanın altında açıklayıcı mesaj |
| 2.2.1 Zaman ayarlı içerik | 🟡 | "Geri al" balonu 5 sn sonra kayboluyor. Ekran okuyucu kullanıcıları için süre uzatılabilir |

## Açık kalan UI/UX işleri
Ayrıntılar [REMAINING_ISSUES.md](REMAINING_ISSUES.md) dosyasında:
- Karanlık mod
- Büyük ekran dosyalarının bölünmesi
- İçgörüler grafiklerinin erişilebilirliği
- Sistem yazı boyutu testi
- Onboarding görsellerinin sıkıştırılması
- Kartvizit ve onboarding'de kalan sabit stiller
