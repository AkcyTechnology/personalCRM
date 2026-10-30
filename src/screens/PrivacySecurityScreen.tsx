import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AppHeader from "../components/AppHeader";
import { loadSettings, updateSettings } from "../data/userSettings";
import { confirmWipeAllData, runExportBackup, runRestoreBackup } from "../data/backupActions";
import { authenticateAsync, canUseAppLockAsync } from "../utils/biometrics";
import { showToast } from "../components/Toast";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { infoDialog } from "../utils/confirm";
import { t } from "../i18n";
import { analyticsAvailable } from "../utils/analytics";

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
  const [analytics, setAnalytics] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        setAppLock(s.appLockEnabled);
        setAnalytics(s.analytics === true);
      });
      canUseAppLockAsync().then(setLockSupported);
    }, [])
  );

  const toggleAppLock = async (value: boolean) => {
    if (value && !lockSupported) {
      infoDialog(t("Cihaz kilidi gerekli"), t("Uygulama kilidini kullanmak için önce cihazında Face ID, parmak izi veya bir ekran şifresi ayarlamalısın.")
      );
      return;
    }
    // Açarken de kapatırken de kimliği doğrula
    const ok = await authenticateAsync(value ? t("Uygulama kilidini aç") : t("Uygulama kilidini kapat"));
    if (!ok) return;
    setAppLock(value);
    await updateSettings({ appLockEnabled: value });
    showToast(value ? t("Uygulama kilidi açıldı") : t("Uygulama kilidi kapatıldı"));
  };

  const encryptionText =
    Platform.OS === "web"
      ? t("Web sürümünde veriler tarayıcıda saklanır; şifreleme yalnızca iOS ve Android uygulamasında vardır.") : t("Kişilerin, notların ve ayarların cihazında XChaCha20-Poly1305 ile şifrelenir. Anahtar, cihazın güvenli donanımında (Keychain / Keystore) tutulur ve yedeklere dahil edilmez.");

  return (
    <View style={styles.screen}>
      <AppHeader type="settings" centerTitle={t("Gizlilik ve Güvenlik")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <Ionicons name="shield-checkmark" size={22} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{t("Verilerin yalnızca bu cihazda")}</Text>
            <Text style={styles.bannerText}>{encryptionText}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t("GÜVENLİK")}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="finger-print" size={20} color={colors.primary} style={styles.rowIcon} />
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>{t("Uygulama kilidi")}</Text>
              <Text style={styles.rowDesc}>
                {lockSupported
                  ? t("Açılışta ve 30 sn arka planda kaldıktan sonra Face ID / parmak izi / cihaz şifresi iste") : t("Cihazında Face ID, parmak izi veya ekran şifresi ayarlı değil")}
              </Text>
            </View>
            <Switch
              value={appLock}
              onValueChange={toggleAppLock}
              trackColor={{ false: BORDER, true: colors.primary }}
              thumbColor={colors.white}
              accessibilityLabel={t("Uygulama kilidi")}
            />
          </View>
        </View>

        {analyticsAvailable() ? (
          <>
            <Text style={styles.sectionLabel}>{t("GELİŞTİRMEYE YARDIM")}</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Ionicons name="analytics-outline" size={20} color={colors.primary} style={styles.rowIcon} />
                <View style={styles.rowInfo}>
                  <Text style={styles.rowLabel}>{t("Anonim kullanım istatistikleri")}</Text>
                  <Text style={styles.rowDesc}>
                    {t("Hangi özelliklerin kullanıldığını sayar. Kişilerin ve notların asla gönderilmez.")}
                  </Text>
                </View>
                <Switch
                  value={analytics}
                  onValueChange={async (v) => {
                    setAnalytics(v);
                    await updateSettings({ analytics: v, analyticsAsked: true });
                  }}
                  trackColor={{ false: BORDER, true: colors.primary }}
                  thumbColor={colors.white}
                  accessibilityLabel={t("Anonim kullanım istatistikleri")}
                />
              </View>
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>{t("VERİLERİM")}</Text>
        <View style={styles.card}>
          <Row
            icon="download-outline"
            label={t("Yedek al")}
            desc={t("Tüm verilerini bir dosyaya aktar. İstersen parolayla şifrele.")}
            onPress={runExportBackup}
          />
          <Row
            icon="cloud-upload-outline"
            label={t("Yedekten geri yükle")}
            desc={t("Daha önce aldığın bir yedeği içe aktar")}
            onPress={() => runRestoreBackup()}
            border
          />
        </View>

        <Text style={styles.sectionLabel}>{t("YASAL")}</Text>
        <View style={styles.card}>
          <Row
            icon="document-text-outline"
            label={t("Gizlilik Politikası")}
            desc={t("Hangi verileri neden işlediğimiz (KVKK / GDPR)")}
            onPress={() => navigation.navigate("Legal", { doc: "privacy" })}
          />
          <Row
            icon="reader-outline"
            label={t("Kullanım Şartları")}
            desc={t("Uygulamayı kullanma koşulları")}
            onPress={() => navigation.navigate("Legal", { doc: "terms" })}
            border
          />
        </View>

        <Text style={styles.sectionLabel}>{t("TEHLİKELİ BÖLGE")}</Text>
        <View style={styles.card}>
          <Row
            icon="trash-outline"
            label={t("Tüm verileri sil")}
            desc={t("Kişiler, notlar, geçmiş, kartvizit ve ayarlar bu cihazdan kalıcı olarak silinir")}
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
