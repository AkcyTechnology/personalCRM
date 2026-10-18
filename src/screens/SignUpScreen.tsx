import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ScrollView, useWindowDimensions, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { updateSettings } from "../data/userSettings";
import { t } from "../i18n";

const TEAL = colors.primary;

export default function SignUpScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const panelWidth = Math.min(width, 430);
  const imgH = Math.min(Math.round(height * 0.28), 220);

  return (
    // Outer: full screen, clips horizontal overflow, centres panel
    <View style={[styles.outer, { overflow: "hidden" as any }]}>
      <View style={[styles.centerer, { width }]}>
        <ScrollView
          style={{ width: panelWidth }}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Illustration + Beta badge — relative parent */}
          <View style={[styles.imgWrap, { height: imgH }]}>
            <Image
              source={require("../../assets/onboarding4.png")}
              style={styles.img}
              resizeMode="contain"
            />
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>{t("BETA")}</Text>
            </View>
          </View>

          {/* Headings */}
          <Text style={styles.title}>{t("Hoş Geldin")}</Text>
          <Text style={styles.subtitle}>{t("Senin için önemli olan kişilerle\nbağını hiç kaybetme.")}</Text>
          <Text style={styles.tagline}>{t("Life happens between people.")}</Text>

          {/* Privacy promises */}
          <View style={styles.promiseGroup}>
            <PromiseRow icon="lock-closed-outline" text={Platform.OS === "web" ? t("Verilerin yalnızca bu cihazda saklanır") : t("Verilerin cihazında şifreli saklanır")} />
            <PromiseRow icon="cloud-offline-outline" text={t("Hesap yok, sunucu yok, reklam yok")} />
            <PromiseRow icon="trash-outline" text={t("İstediğin an tek dokunuşla hepsini sil")} />
          </View>

          {/* Primary CTA */}
          <View style={styles.guestWrap}>
            <TouchableOpacity
              onPress={async () => {
                await updateSettings({ acceptedTermsAt: new Date().toISOString() });
                navigation.navigate("Welcome");
              }}
              activeOpacity={0.85}
              style={styles.guestTouch}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[colors.gradientFrom, TEAL]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.guestBtn}
              >
                <Text style={styles.guestBtnText}>{t("Başlayalım")}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.guestNote}>{t("Hesap oluşturman gerekmez.")}</Text>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            {t("Devam ederek ")}
            <Text
              style={styles.link}
              onPress={() => navigation.navigate("Legal", { doc: "terms" })}
              accessibilityRole="link"
            >
              {t("Kullanım Şartları")}
            </Text>
            {t("'nı ve ")}
            <Text
              style={styles.link}
              onPress={() => navigation.navigate("Legal", { doc: "privacy" })}
              accessibilityRole="link"
            >
              {t("Gizlilik Politikası")}
            </Text>
            {t("'nı kabul etmiş olursun.")}{"\n"}{t("Verilerin asla satılmaz.")}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

function PromiseRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.promiseRow}>
      <View style={styles.promiseLeft}>
        <Ionicons name={icon} size={20} color={colors.primary} style={styles.promiseIcon} />
        <Text style={styles.promiseLabel}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tagline: { marginTop: 10, fontSize: 14, fontWeight: "700", color: colors.primary, textAlign: "center", letterSpacing: 0.3 },
  promiseLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
  outer: {
    flex: 1,
    backgroundColor: colors.card,
  },
  centerer: {
    flex: 1,
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
  },

  // Image area — relative so badge can be absolute inside
  imgWrap: {
    width: "100%",
    position: "relative",
    marginBottom: 4,
  },
  img: { width: "100%", height: "100%" },

  betaBadge: {
    position: "absolute",
    top: 12,
    right: 0,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  betaText: { fontSize: 11, fontWeight: "900", color: TEAL, letterSpacing: 1 },

  title: {
    fontSize: 26, fontWeight: "900", color: colors.text,
    marginTop: 12, textAlign: "center",
  },
  subtitle: {
    fontSize: 14, color: colors.textSub,
    textAlign: "center", lineHeight: 22, marginTop: 8,
  },

  promiseGroup: { width: "100%", gap: 10, marginTop: 24 },
  promiseRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  promiseLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  promiseIcon: { fontSize: 18, width: 24, textAlign: "center" },

  guestWrap: { width: "100%", marginTop: 18 },
  guestTouch: {
    borderRadius: 16, overflow: "hidden",
    shadowColor: TEAL, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38, shadowRadius: 16, elevation: 10,
  },
  guestBtn: { height: 56, alignItems: "center", justifyContent: "center" },
  guestBtnText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  guestNote: { textAlign: "center", marginTop: 10, fontSize: 12, color: colors.textMuted },

  footer: { marginTop: 20, fontSize: 11, color: colors.textMuted, textAlign: "center", lineHeight: 18 },
  link: { color: TEAL, fontWeight: "600" },
});
