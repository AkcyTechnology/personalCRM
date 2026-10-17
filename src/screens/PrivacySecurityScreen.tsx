import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
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
const RED = colors.danger;

export default function PrivacySecurityScreen({ navigation }: any) {
  return (
    <View style={styles.screen}>
      <AppHeader type="settings" centerTitle="Gizlilik ve Güvenlik" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>GÜVENLİK</Text>

        <View style={styles.card}>
          <Row
            label="Şifreyi değiştir"
            desc="Hesap şifreni güncelle"
            onPress={() => Alert.alert("Yakında", "Bu özellik yakında eklenecek.")}
          />
          <Row
            label="İki faktörlü doğrulama"
            desc="Hesabına ekstra koruma katmanı ekle"
            onPress={() => Alert.alert("Yakında", "Bu özellik yakında eklenecek.")}
            border
          />
        </View>

        <Text style={styles.sectionLabel}>VERİ GİZLİLİĞİ</Text>

        <View style={styles.card}>
          <Row
            label="Veri görünürlüğü"
            desc="Verilerinin nasıl kullanıldığını kontrol et"
            onPress={() => Alert.alert("Gizlilik", "Tüm veriler yalnızca cihazında saklanır.")}
          />
          <Row
            label="Analitik izni"
            desc="Uygulama geliştirme için anonim veri paylaşımı"
            onPress={() => Alert.alert("Yakında", "Bu özellik yakında eklenecek.")}
            border
          />
        </View>

        <Text style={styles.sectionLabel}>HESAP</Text>

        <View style={styles.card}>
          <Row
            label="Hesabı sil"
            desc="Tüm verilerin kalıcı olarak silinir"
            onPress={() =>
              Alert.alert(
                "Hesabı Sil",
                "Bu işlem geri alınamaz. Tüm veriler silinecek.",
                [
                  { text: "İptal", style: "cancel" },
                  { text: "Sil", style: "destructive" },
                ]
              )
            }
            danger
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  desc,
  onPress,
  border,
  danger,
}: {
  label: string;
  desc: string;
  onPress: () => void;
  border?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, border && styles.borderTop]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, danger && { color: RED }]}>{label}</Text>
        <Text style={styles.rowDesc}>{desc}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  borderTop: { borderTopWidth: 1, borderTopColor: BORDER },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "700", color: TEXT },
  rowDesc: { marginTop: 2, fontSize: 12, color: MUTED },
  chevron: { fontSize: 22, color: MUTED },
});
