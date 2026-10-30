import { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme/colors";
import { t } from "../i18n";

const TEAL = colors.primary;

const SLIDES = [
  {
    id: "1",
    image: require("../../assets/onboarding1.png"),
    title: "İlişkilerini\nunutma.",
    desc: "Yakın çevreni, iş bağlantılarını ve özel günleri tek yerde takip et.",
    btn: "Devam",
  },
  {
    id: "2",
    image: require("../../assets/onboarding2.png"),
    title: "Doğru zamanda\nhatırla.",
    desc: "Her kişi için iletişim aralığı belirle, zamanı geldiğinde hatırlat.",
    btn: "Devam",
  },
  {
    id: "3",
    image: require("../../assets/onboarding3.png"),
    title: "Mesajını kolayca\nhazırla.",
    desc: "Notlarına ve ilişkinize göre samimi ya da profesyonel mesaj önerileri al.",
    btn: "Başlayalım",
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);

  const opacity   = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const navigate = (nextIdx: number) => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0,   duration: 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -16, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setIndex(nextIdx);
      translateY.setValue(20);
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () =>
    index < SLIDES.length - 1 ? navigate(index + 1) : navigation.navigate("SignUp");

  const handleSkip = () => navigation.navigate("SignUp");

  const slide = SLIDES[index];

  const panelWidth = Math.min(width, 430);
  // Cap image at 38 % of screen height but never more than 280 px
  const imgH = Math.min(Math.round(height * 0.38), 280);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip — top right */}
      <TouchableOpacity
        onPress={handleSkip}
        hitSlop={{ top: 10, bottom: 10, left: 16, right: 16 }}
        style={[styles.skipCorner, { top: insets.top + 12 }]}
      >
        <Text style={styles.skip}>{t("Atla")}</Text>
      </TouchableOpacity>

      {/* Horizontally centres the 430-px panel on wide screens */}
      <View style={[styles.centerer, { width }]}>
        {/* Panel: vertically centres the whole content block */}
        <View style={[styles.panel, { width: panelWidth }]}>

          {/* Single animated group — illustration → dots → title → desc → button */}
          <Animated.View style={[styles.group, { opacity, transform: [{ translateY }] }]}>

            {/* Illustration */}
            <View style={[styles.imgWrap, { height: imgH }]}>
              <Image source={slide.image} style={styles.img} resizeMode="contain" />
            </View>

            {/* Dots — 24 px below illustration */}
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => i !== index && navigate(i)}
                  hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("{current}. sayfa / {total}", { current: i + 1, total: SLIDES.length })}
                  accessibilityState={{ selected: i === index }}
                >
                  <View style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Title — 20 px below dots */}
            <Text style={styles.title}>{t(slide.title)}</Text>

            {/* Description — 12 px below title */}
            <Text style={styles.desc}>{t(slide.desc)}</Text>

            {/* Primary button — 40 px below description */}
            <View style={styles.btnShadow}>
              <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.btnTouch}>
                <LinearGradient
                  colors={[colors.gradientFrom, TEAL]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.btn}
                >
                  <Text style={styles.btnText}>{t(slide.btn)}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.card,
    overflow: "hidden",
  },

  skipCorner: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },

  centerer: {
    flex: 1,
    alignItems: "center",
  },

  // flex: 1 + justifyContent: "center" → keeps the group vertically centred
  panel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },

  // No flex: 1 here — natural height only, so it stays as a compact block
  group: {
    width: "100%",
    alignItems: "center",
  },

  imgWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  img: {
    width: "100%",
    height: "100%",
  },

  dots: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive:   { width: 22, backgroundColor: TEAL },
  dotInactive: { width: 6,  backgroundColor: colors.primarySoft },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
    lineHeight: 34,
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
    color: colors.onFill,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  skip: { fontSize: 14, color: colors.textMuted, fontWeight: "600" },
});
