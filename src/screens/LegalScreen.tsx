import { View, Text, StyleSheet, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import AppHeader from "../components/AppHeader";
import { colors } from "../theme/colors";
import { locale, t } from "../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "Legal">;

type Section = { title: string; body: string };

const UPDATED = new Date(2026, 9, 31);

const PRIVACY: Section[] = [
  {
    title: "Özet",
    body:
      "Connectly, ilişkilerini sıcak tutman için tasarlanmış bir kişisel ilişki uygulamasıdır. Girdiğin tüm bilgiler yalnızca senin cihazında saklanır. Kişilerin, notların ve görüşme geçmişin hiçbir sunucuya gönderilmez, satılmaz, reklam veya profil oluşturma amacıyla kullanılmaz. Tek istisna, yalnızca sen izin verirsen gönderilen anonim kullanım istatistikleridir (aşağıya bak).",
  },
  {
    title: "Hangi verileri işliyoruz?",
    body:
      "• Senin eklediğin kişiler: ad, telefon, e-posta, şirket, unvan, doğum günü, şehir, sosyal medya hesapları, etiketler, notlar ve görüşme geçmişi.\n• Profil bilgilerin: adın, e-postan, telefonun, şehrin ve hedeflerin.\n• Dijital kartvizit bilgilerin.\n• Uygulama tercihlerin (hatırlatma aralıkları, bildirim ayarları, uygulama kilidi).",
  },
  {
    title: "Rehber erişimi",
    body:
      "Rehber izni yalnızca sen “Rehberden kişi seç” veya “Rehberden aktar” dediğinde istenir. iOS’ta tek kişi seçerken sistem seçicisi kullanılır ve uygulamaya sadece seçtiğin kişi gelir. Toplu aktarımda yalnızca ad, telefon, e-posta ve doğum günü okunur; sadece işaretlediğin kişiler kaydedilir. Rehberin hiçbir zaman cihaz dışına gönderilmez.",
  },
  {
    title: "Anonim kullanım istatistikleri",
    body:
      "Yalnızca sen “Evet, yardım edeyim” dersen, hangi özelliklerin kullanıldığını anlamak için anonim olaylar gönderilir (ör. “bir an kaydedildi”, “hikâye paylaşıldı”). Her olayla birlikte rastgele bir kurulum kimliği, platform, uygulama dili ve sürümü ile “2-5” gibi yuvarlanmış sayılar gider. Kişi adları, telefon numaraları, notlar, tarihler ve rehber bilgileri asla gönderilmez; kişi profili ve konum tahmini kapalıdır. Veriler PostHog’un AB sunucularında işlenir. İzni istediğin an “Gizlilik ve Güvenlik” ekranından geri alabilirsin; “Tüm verileri sil” kurulum kimliğini de siler.",
  },
  {
    title: "Ana ekran widget’ı",
    body:
      "iOS ana ekran widget’ı ağacının durumunu, haftalık ilerlemeni ve günün kişisinin yalnızca ilk adını gösterir. Uygulama kilidi açıksa widget’ta isim gösterilmez. Widget verisi yalnızca cihazındaki paylaşılan uygulama alanında tutulur.",
  },
  {
    title: "Bildirimler",
    body:
      "Hatırlatıcılar cihazında yerel bildirim olarak zamanlanır. Bildirim içerikleri herhangi bir sunucudan geçmez.",
  },
  {
    title: "Güvenlik",
    body:
      "iOS ve Android’de veriler cihazda XChaCha20-Poly1305 ile şifrelenir. Şifreleme anahtarı cihazın güvenli donanımında (iOS Keychain / Android Keystore) “yalnızca bu cihaz” ayarıyla tutulur ve bulut yedeklerine dahil edilmez. Android otomatik yedeklemesi kapalıdır. İstersen Face ID, parmak izi veya cihaz şifresiyle uygulama kilidi açabilirsin. Panoya kopyalanan mesajlar 90 saniye sonra panodan temizlenir.",
  },
  {
    title: "Yedekler",
    body:
      "“Yedek al” ile oluşturulan dosya senin seçtiğin yere (ör. Dosyalar, e-posta) kaydedilir. Parola belirlersen dosya scrypt ile türetilen bir anahtarla XChaCha20-Poly1305 kullanılarak şifrelenir; parola olmadan açılamaz ve unutulursa kurtarılamaz. Parolasız yedek şifresizdir; bu dosyanın güvenliği senin sorumluluğundadır. Geçici kopya paylaşım tamamlanınca cihazdan silinir.",
  },
  {
    title: "Paylaştığın içerikler",
    body:
      "Arama, WhatsApp, e-posta veya kartvizit paylaşımı gibi işlemler cihazındaki ilgili uygulamaya devredilir; bu uygulamaların kendi gizlilik politikaları geçerlidir.",
  },
  {
    title: "Hakların (KVKK md. 11 / GDPR)",
    body:
      "Verilerin tamamen senin kontrolündedir: dilediğin an görüntüleyebilir, düzeltebilir, yedek alarak taşıyabilir veya “Gizlilik ve Güvenlik → Tüm verileri sil” ile kalıcı olarak silebilirsin. Uygulamayı silmek de tüm verileri siler.",
  },
  {
    title: "Çocuklar",
    body: "Connectly 13 yaşın altındaki çocuklara yönelik değildir.",
  },
  {
    title: "İletişim ve değişiklikler",
    body:
      "Sorularını uygulamanın App Store / Google Play sayfasındaki destek adresine iletebilirsin. Bu politika değişirse uygulama içinde güncellenir ve güncelleme tarihi değiştirilir.",
  },
];

const TERMS: Section[] = [
  {
    title: "Kabul",
    body: "Connectly’yi kullanarak bu şartları kabul etmiş olursun. Kabul etmiyorsan uygulamayı kullanmamalısın.",
  },
  {
    title: "Hizmetin kapsamı",
    body:
      "Connectly; kişilerini, görüşme geçmişini ve hatırlatıcılarını cihazında düzenlemene yardımcı olan bir araçtır. Uygulama şu an beta aşamasındadır ve tüm özellikler ücretsizdir. Özellikler zaman içinde değişebilir.",
  },
  {
    title: "Senin sorumlulukların",
    body:
      "Uygulamaya eklediğin kişilerin bilgilerini hukuka uygun şekilde edinmiş olmalı ve bu bilgileri yalnızca kişisel amaçlarla kullanmalısın. Başkalarının bilgilerini izinsiz paylaşmak, taciz veya spam amacıyla kullanmak yasaktır.",
  },
  {
    title: "Veri kaybı",
    body:
      "Veriler yalnızca cihazında tutulduğu için cihazın kaybolması, sıfırlanması veya uygulamanın silinmesi verilerin kaybına yol açar. Düzenli olarak “Yedek al” özelliğini kullanmanı öneririz.",
  },
  {
    title: "Garanti reddi",
    body:
      "Uygulama “olduğu gibi” sunulur. Hatırlatıcıların her koşulda zamanında çalışacağı garanti edilmez (ör. bildirim izni kapalıysa veya işletim sistemi bildirimi engellerse). Yürürlükteki mevzuatın izin verdiği ölçüde dolaylı zararlardan sorumluluk kabul edilmez.",
  },
  {
    title: "Fikri mülkiyet",
    body: "Uygulamanın tasarımı, kodu ve markası geliştiricisine aittir. Girdiğin içerikler sana aittir.",
  },
  {
    title: "Değişiklikler ve uygulanacak hukuk",
    body:
      "Bu şartlar güncellenebilir; güncel sürüm her zaman uygulama içinde yer alır. Şartlar Türkiye Cumhuriyeti hukukuna tabidir.",
  },
];

export default function LegalScreen({ navigation, route }: Props) {
  const isPrivacy = route.params.doc === "privacy";
  const sections = isPrivacy ? PRIVACY : TERMS;
  const title = isPrivacy ? t("Gizlilik Politikası") : t("Kullanım Şartları");

  return (
    <View style={styles.screen}>
      <AppHeader type="settings" centerTitle={title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>{t("Son güncelleme: {date}", { date: UPDATED.toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" }) })}</Text>
        {sections.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.heading} accessibilityRole="header">{t(s.title)}</Text>
            <Text style={styles.body}>{t(s.body)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 60 },
  updated: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  section: { marginBottom: 20 },
  heading: { fontSize: 17, fontWeight: "800", color: colors.text, marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 23, color: colors.textSub },
});
