# Mağaza Sayfası (App Store + Google Play)

Metinler karakter sınırlarına göre yazıldı. Ekran görüntüleri: `store/screenshots/{tr,en}/{ios,android}/` (yeniden üretmek için `e2e/store-screenshots.js`). Gizlilik URL'si için `docs/` klasörünü GitHub Pages ile yayınla (Settings → Pages → Branch: main, Folder: /docs) ve şu adresleri kullan:

- Gizlilik: `https://<kullanıcı>.github.io/<repo>/privacy.html`
- Şartlar: `https://<kullanıcı>.github.io/<repo>/terms.html`

> Gizlilik metni hâlâ hukukçu onayı bekliyor. Uygulamadaki metin değişirse `npm run legal` ile sayfaları yeniden üret.

---

## Türkçe

| Alan | Sınır | Metin |
|---|---|---|
| Uygulama adı | 30 | Connectly: Sevdiklerinle Bağ |
| Alt başlık (iOS) | 30 | Doğum günü & arama hatırlatıcı |
| Kısa açıklama (Play) | 80 | Sevdiklerini unutma: doğum günleri, hatırlatmalar ve büyüyen bir bağ ağacı. |
| Tanıtım metni (iOS) | 170 | Hayat insanlar arasında geçer. Kimi aramayı unuttuğunu, kimin doğum günü yaklaştığını Connectly hatırlasın; sen sadece merhaba de. |

**Anahtar kelimeler (iOS, 100 karakter, virgülle, boşluksuz):**
`doğum günü,hatırlatıcı,arkadaş,aile,ilişki,rehber,kişisel crm,networking,arama,iletişim,günlük`

**Açıklama:**

Hayat insanlar arasında geçer. Ama yoğun günlerde en sevdiklerimizi bile aramayı unutuyoruz.

Connectly, ilişkilerini görev listesine çevirmeden sıcak tutmana yardım eder.

🌳 Bağ ağacın
Her görüşme ağacına bir yaprak ekler. Bu hafta konuştuğun her kişi bir çiçek açtırır. Ağacın asla solmaz; sen uzaktayken sadece dinlenir.

✨ Bugünün kıvılcımları
Her gün üç küçük öneri: uzun zamandır konuşmadığın biri, yaklaşan bir doğum günü, geçen sefer konuştuğunuz bir konu.

🔀 Karıştır
Kartları kaydır, bugün kime merhaba diyeceğini seç. Mesaj taslağı hazır; gönderen sensin.

🪐 Evrenin
Tüm ilişkilerin tek bir haritada: kim yakın, kim uzaklaşıyor, bir bakışta.

📖 Ayın hikâyesi
Ayın sonunda kimlerle bağ kurduğunu gösteren, paylaşmaya hazır bir kart. İsimler sen istemedikçe gizli.

🎂 Doğum günleri ve hatırlatmalar
Kimseyi unutma; hatırlatmalar nazik, suçluluk duygusu yok.

🔒 Verilerin sadece telefonunda
• Hesap açmak gerekmez
• Kişilerin ve notların telefonunda şifreli (XChaCha20-Poly1305) saklanır
• Reklam yok, veri satışı yok
• Face ID / parmak izi ile uygulama kilidi
• İstersen tek dokunuşla tüm verileri sil

Türkçe ve İngilizce. Karanlık mod. iOS ana ekran widget'ı.

---

## English

| Field | Limit | Text |
|---|---|---|
| App name | 30 | Connectly: Keep in Touch |
| Subtitle (iOS) | 30 | Birthdays & catch-up reminders |
| Short description (Play) | 80 | Never lose touch: birthdays, gentle reminders and a bond tree that grows. |
| Promotional text (iOS) | 170 | Life happens between people. Connectly remembers who you haven't called and whose birthday is coming up, so all you have to do is say hi. |

**Keywords (iOS, 100 chars):**
`birthday,reminder,friends,family,relationship,personal crm,contacts,network,catch up,call,stay`

**Description:**

Life happens between people. But on busy days we forget to call even the ones we love most.

Connectly helps you keep your relationships warm, without turning them into a to-do list.

🌳 Your bond tree
Every catch-up adds a leaf. Everyone you talk to this week makes a flower bloom. Your tree never wilts; while you're away, it simply rests.

✨ Today's sparks
Three small ideas a day: someone you haven't talked to in a while, a birthday coming up, something you talked about last time.

🔀 Shuffle
Swipe through cards and pick who to say hi to today. A message draft is ready; you're the one who sends it.

🪐 Your universe
All your relationships on one map: who's close and who's drifting, at a glance.

📖 Your month's story
A shareable card of the people you connected with this month. Names stay hidden unless you choose.

🎂 Birthdays and reminders
Gentle reminders, never guilt.

🔒 Your data stays on your phone
• No account needed
• Contacts and notes encrypted on your device (XChaCha20-Poly1305)
• No ads, no data selling
• App lock with Face ID / fingerprint
• Delete everything with one tap

English and Turkish. Dark mode. iOS home-screen widget.

---

## Kategori ve yaş

- **Kategori:** Lifestyle (iOS) · Lifestyle (Play). Alternatif: Social Networking.
- **Yaş sınırı:** 4+ (iOS) · Herkes / PEGI 3 (Play). Kullanıcı tarafından üretilen paylaşılan içerik, sohbet, reklam yok.
- **Fiyat:** Ücretsiz (abonelik ekranı yalnızca bilgi veriyor; ödeme alınmıyor).

---

## App Store "App Privacy" cevapları

`EXPO_PUBLIC_POSTHOG_KEY` **tanımlıysa** (anonim istatistik açık):

| Soru | Cevap |
|---|---|
| Veri topluyor musunuz? | **Evet** |
| Toplanan veri türü | **Usage Data → Product Interaction** |
| Kimlikle ilişkilendiriliyor mu? | **Hayır** (Not linked to the user) |
| Takip (tracking) için kullanılıyor mu? | **Hayır** |
| Amaç | **Analytics** |

Kişiler, notlar, rehber, konum, kimlik, iletişim bilgisi: **toplanmıyor**; hepsi yalnızca cihazda kalıyor. Apple'ın tanımında "collect" cihaz dışına gönderilen veri demek.

`EXPO_PUBLIC_POSTHOG_KEY` **tanımlı değilse**: "Data Not Collected".

**Uygulama izinleri (gerekçeler `locales/` içinde, TR + EN):** Rehber (yalnızca seçilen kişiler), Face ID (uygulama kilidi), Bildirimler (yerel hatırlatmalar).

## Google Play "Data safety" cevapları

| Soru | Cevap |
|---|---|
| Uygulama kullanıcı verisi topluyor ya da paylaşıyor mu? | **Evet**, yalnızca anonim istatistik açıksa. Değilse **Hayır**. |
| Toplanan veri | App activity → **App interactions** |
| İsteğe bağlı mı? | **Evet**: kullanıcı açıkça "Evet" demeden gönderilmez |
| Amaç | **Analytics** |
| Paylaşılıyor mu? | **Hayır** (PostHog veri işleyen olarak sayılır, "sharing" değildir) |
| Aktarımda şifreli mi? | **Evet** (HTTPS) |
| Kullanıcı silme isteyebilir mi? | **Evet**: Gizlilik → izni kapat; "Tüm verileri sil" kurulum kimliğini siler |

Rehber izni: "Kişiler yalnızca cihazda işlenir, cihaz dışına çıkmaz" olarak beyan et.

---

## İnceleme notu (App Review Notes)

> Connectly works fully offline and needs no account. To see the main features quickly: tap "Atla / Skip", "Başlayalım / Let's begin", fill in a name, then add a person with the + button. The contacts permission is only requested when the user taps "Import from contacts". Anonymous analytics are opt-in and are asked once after the first contact is added. The home-screen widget shows the bond tree and, unless app lock is on, the first name of the "person of the day".

---

## Yayın öncesi kontrol

- [ ] `docs/` GitHub Pages'te yayında; gizlilik URL'si mağaza formlarına girildi
- [ ] Gizlilik metni hukukçu onaylı
- [ ] PostHog projesinde **"Discard client IP data"** açık, bölge **EU**
- [ ] EAS ortam değişkeni: `EXPO_PUBLIC_POSTHOG_KEY` (production profili)
- [ ] App Store Connect'te App Group `group.com.tugceulucn.personalCRM` tanımlı (EAS otomatik oluşturur; elle imzalıyorsan ekle)
- [ ] Ekran görüntüleri yüklendi (iOS 6.9" için `ios/`, Play için `android/`)
