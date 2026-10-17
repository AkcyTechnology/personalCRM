import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import AppHeader from "../components/AppHeader";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

const PURPLE = colors.primary;
const BG = colors.bg;
const CARD = colors.card;
const BORDER = colors.border;
const TEXT = colors.text;
const MUTED = colors.textSub;

const BETA_FEATURES = [
  "Sınırsız kişi",
  "Hatırlatıcılar ve doğum günü bildirimleri",
  "Görüşme geçmişi ve notlar",
  "Mesaj önerileri",
  "İçgörüler ve ilişki sağlığı",
  "Dijital kartvizit ve QR kod",
  "Şifreli depolama ve uygulama kilidi",
  "Yedek alma ve geri yükleme",
];

export default function ManageSubscriptionScreen({ navigation }: any) {
  return (
    <View style={styles.screen}>
      <AppHeader type="settings" centerTitle="Abonelik" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.currentLabel}>Mevcut planın</Text>

        <View style={[styles.planCard, styles.planCardActive]}>
          <View style={styles.planTop}>
            <View>
              <Text style={[styles.planName, { color: PURPLE }]}>Beta · Ücretsiz</Text>
              <View style={styles.priceRow}>
                <Text style={styles.planPrice}>₺0</Text>
              </View>
            </View>
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Aktif</Text>
            </View>
          </View>

          <Text style={styles.featureText}>
            Beta süresince tüm özellikler herkese açık ve ücretsiz. Kart bilgisi istemiyoruz, otomatik yenilenen bir ödeme yok.
          </Text>

          <View style={styles.featureList}>
            {BETA_FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 28, color: PURPLE, lineHeight: 32 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: TEXT },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60 },
  currentLabel: { fontSize: 13, color: MUTED, marginBottom: 16, fontWeight: "600" },
  planCard: {
    backgroundColor: CARD,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 14,
  },
  planCardActive: {
    borderColor: PURPLE,
    backgroundColor: colors.accentSoft,
  },
  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  planName: { fontSize: 17, fontWeight: "900", color: TEXT },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2, marginTop: 2 },
  planPrice: { fontSize: 22, fontWeight: "900", color: TEXT },
  planPeriod: { fontSize: 13, color: MUTED },
  currentBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentBadgeText: { fontSize: 11, fontWeight: "800", color: PURPLE },
  featureList: { gap: 6 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureCheck: { color: PURPLE, fontSize: 14, fontWeight: "900" },
  featureText: { fontSize: 13, color: TEXT },
  upgradeBtn: {
    marginTop: 16,
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  upgradeBtnText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 20,
  },
  emptyBilling: { fontSize: 13, color: MUTED, textAlign: "center" },
  cancelRow: { alignItems: "center", paddingVertical: 8 },
  cancelText: { fontSize: 13, color: MUTED, fontWeight: "600" },
});
