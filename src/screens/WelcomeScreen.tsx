import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";

const TEAL = colors.primary;

export default function WelcomeScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const panelWidth = Math.min(width, 430);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.centerer, { width }]}>
        <View style={[styles.panel, { width: panelWidth }]}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>👋</Text>
          </View>

          <Text style={styles.title}>Merhaba, seni tanıyalım</Text>
          <Text style={styles.desc}>
            Kişisel CRM deneyimini sana göre ayarlamak için birkaç bilgiye ihtiyacımız var.
          </Text>

          <View style={styles.btnShadow}>
            <TouchableOpacity
              onPress={() => navigation.navigate("OnboardingFlow")}
              activeOpacity={0.85}
              style={styles.btnTouch}
            >
              <LinearGradient
                colors={["#4DD9CF", TEAL]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btn}
              >
                <Text style={styles.btnText}>Devam et</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FAFEFE",
  },
  centerer: {
    flex: 1,
    alignItems: "center",
  },
  panel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    color: colors.textSub,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: 40,
  },
  btnShadow: {
    width: "100%",
    borderRadius: 16,
    shadowColor: TEAL,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  btnTouch: { borderRadius: 16, overflow: "hidden" },
  btn: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
