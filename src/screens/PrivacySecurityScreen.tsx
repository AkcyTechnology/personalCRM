import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "../components/AppHeader";
import { loadSettings, updateSettings } from "../data/userSettings";
import { confirmWipeAllData, runExportBackup, runRestoreBackup } from "../data/backupActions";
import { authenticateAsync, canUseAppLockAsync } from "../utils/biometrics";
import { showToast } from "../components/Toast";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

const BG = colors.bg;
const CARD = colors.card;
const BORDER = colors.border;
const TEXT = colors.text;
const MUTED = colors.textSub;
const RED = colors.danger;

type IconName = keyof typeof Ionicons.glyphMap;

export default function PrivacySecurityScreen({ navigation }: any) {
  const [appLock, setAppLock] = useState(false);
  const [lockSupported, setLockSupported] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => setAppLock(s.appLockEnabled));
      canUseAppLockAsync().then(setLockSupported);
    }, [])
  );

  const toggleAppLock = async (value: boolean) => {
    if (value && !lockSupported) {
      Alert.alert(
        "Cihaz kilidi gerekli",
        "Uygulama kilidini kullanmak için önce cihazında Face ID, parmak izi veya bir ekran şifresi ayarlamalısın."
      );
      return;
    }
    // Açarken de kapatırken de kimliği doğrula
    const ok = await authenticateAsync(value ? "Uygulama kilidini aç" : "Uygulama kilidini kapat");
    if (!ok) return;
    setAppLock(value);
    await updateSettings({ appLockEnabled: value });
    showToast(value ? "Uygulama kilidi açıldı" : "Uygulama kilidi kapatıldı");
  };

  const encryptionText =
    Platform.OS === "web"
      ? "Web sürümünde veriler tarayıcıda saklanır; şifreleme yalnızca iOS ve Android uygulamasında vardır."
      : "Kişilerin, notların ve ayarların cihazında XChaCha20-Poly1305 ile şifrelenir. Anahtar, cihazın güvenli donanımında (Keychain / Keystore) tutulur ve yedeklere dahil edilmez.";

  return (
    <View style={styles.screen}>
      <AppHeader type="settings" centerTitle="Gizlilik ve Güvenlik" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="shield-checkmark" size={22} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Verilerin yalnızca bu cihazda</Text>
            <Text style={styles.bannerText}>{encryptionText}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>GÜVENLİK</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="finger-print" size={20} color={colors.primary} style={styles.rowIcon} />
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Uygulama kilidi</Text>
              <Text style={styles.rowDesc}>
                {lockSupported
                  ? "Açılışta ve 30 sn arka planda kaldıktan sonra Face ID / parmak izi / cihaz şifresi iste"
                  : "Cihazında Face ID, parmak izi veya ekran şifresi ayarlı değil"}
              </Text>
            </View>
            <Switch
              value={appLock}
              onValueChange={toggleAppLock}
              trackColor={{ false: BORDER, true: colors.primary }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Uygulama kilidi"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>VERİLERİM</Text>
        <View style={styles.card}>
          <Row
            icon="download-outline"
            label="Yedek al"
            desc="Tüm verilerini bir .json dosyasına aktar. Dosya şifresizdir; güvenli bir yerde sakla."
            onPress={runExportBackup}
          />
          <Row
            icon="cloud-upload-outline"
            label="Yedekten geri yükle"
            desc="Daha önce aldığın bir yedeği içe aktar"
            onPress={() => runRestoreBackup()}
            border
          />
        </View>

        <Text style={styles.sectionLabel}>YASAL</Text>
        <View style={styles.card}>
          <Row
            icon="document-text-outline"
            label="Gizlilik Politikası"
            desc="Hangi verileri neden işlediğimiz (KVKK / GDPR)"
            onPress={() => navigation.navigate("Legal", { doc: "privacy" })}
          />
          <Row
            icon="reader-outline"
            label="Kullanım Şartları"
            desc="Uygulamayı kullanma koşulları"
            onPress={() => navigation.navigate("Legal", { doc: "terms" })}
            border
          />
        </View>

        <Text style={styles.sectionLabel}>TEHLİKELİ BÖLGE</Text>
        <View style={styles.card}>
          <Row
            icon="trash-outline"
            label="Tüm verileri sil"
            desc="Kişiler, notlar, geçmiş, kartvizit ve ayarlar bu cihazdan kalıcı olarak silinir"
            onPress={() =>
              confirmWipeAllData(() => navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] }))
            }
            danger
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  desc,
  onPress,
  border,
  danger,
}: {
  icon: IconName;
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={desc}
    >
      <Ionicons name={icon} size={20} color={danger ? RED : colors.primary} style={styles.rowIcon} />
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
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  banner: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.successSoft,
    marginBottom: 24,
  },
  bannerTitle: { fontSize: 15, fontWeight: "800", color: TEXT },
  bannerText: { fontSize: 13, color: MUTED, marginTop: 4, lineHeight: 19 },
  sectionLabel: {
    fontSize: 12,
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
    gap: 12,
  },
  rowIcon: { width: 24 },
  borderTop: { borderTopWidth: 1, borderTopColor: BORDER },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "700", color: TEXT },
  rowDesc: { marginTop: 2, fontSize: 13, color: MUTED, lineHeight: 18 },
  chevron: { fontSize: 22, color: MUTED },
});
