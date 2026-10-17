import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ScrollView, useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

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
              <Text style={styles.betaText}>BETA</Text>
            </View>
          </View>

          {/* Headings */}
          <Text style={styles.title}>Hoş Geldin</Text>
          <Text style={styles.subtitle}>
            Senin için önemli olan kişilerle{"\n"}bağını hiç kaybetme.
          </Text>

          {/* Disabled login options */}
          <View style={styles.disabledGroup}>
            <DisabledBtn icon="🍎" label="Apple ile devam et" />
            <DisabledBtn icon="G" label="Google ile devam et" isGoogle />
            <DisabledBtn icon="✉" label="E-posta ile devam et" />
          </View>

          {/* Primary CTA */}
          <View style={styles.guestWrap}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Welcome")}
              activeOpacity={0.85}
              style={styles.guestTouch}
            >
              <LinearGradient
                colors={["#4DD9CF", TEAL]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.guestBtn}
              >
                <Text style={styles.guestBtnText}>Misafir olarak devam et</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.guestNote}>Beta sürecinde hesap gerekmez.</Text>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            Devam ederek{" "}
            <Text style={styles.link}>Kullanım Şartları</Text>
            {"'"}nı ve{" "}
            <Text style={styles.link}>Gizlilik Politikası</Text>
            {"'"}nı kabul etmiş olursun.{"\n"}Verilerin şifrelenir ve asla satılmaz.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

function DisabledBtn({
  icon, label, isGoogle,
}: {
  icon: string; label: string; isGoogle?: boolean;
}) {
  return (
    <View style={styles.disabledBtn}>
      <View style={styles.disabledLeft}>
        <Text style={[styles.disabledIcon, isGoogle && styles.googleIcon]}>{icon}</Text>
        <Text style={styles.disabledLabel}>{label}</Text>
      </View>
      <View style={styles.comingSoonPill}>
        <Text style={styles.comingSoonText}>Yakında</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: "#FAFAFE",
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
    fontSize: 26, fontWeight: "900", color: "#1A1830",
    marginTop: 12, textAlign: "center",
  },
  subtitle: {
    fontSize: 14, color: "#8E8AA3",
    textAlign: "center", lineHeight: 22, marginTop: 8,
  },

  disabledGroup: { width: "100%", gap: 10, marginTop: 24, opacity: 0.5 },
  disabledBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1, borderColor: "#E8E4F4",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  disabledLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  disabledIcon: { fontSize: 18, width: 24, textAlign: "center" },
  googleIcon: { fontWeight: "900", fontSize: 17, color: "#4285F4" },
  disabledLabel: { fontSize: 14, fontWeight: "700", color: "#1A1830" },
  comingSoonPill: {
    backgroundColor: colors.primarySoft, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  comingSoonText: { fontSize: 11, fontWeight: "700", color: TEAL },

  guestWrap: { width: "100%", marginTop: 18 },
  guestTouch: {
    borderRadius: 16, overflow: "hidden",
    shadowColor: TEAL, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38, shadowRadius: 16, elevation: 10,
  },
  guestBtn: { height: 56, alignItems: "center", justifyContent: "center" },
  guestBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  guestNote: { textAlign: "center", marginTop: 10, fontSize: 12, color: "#A0A0B0" },

  footer: { marginTop: 20, fontSize: 11, color: "#A0A0B0", textAlign: "center", lineHeight: 18 },
  link: { color: TEAL, fontWeight: "600" },
});
