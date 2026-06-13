import { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const slides = [
  {
    id: "1",
    title: "Never lose important relationships.",
    description: "Your AI relationship memory.",
    button: "Get Started",
  },
  {
    id: "2",
    title: "Remember what matters.",
    description:
      "Kin uses AI to remember important moments, conversations, and details about the people you care about.",
    button: "Continue",
  },
  {
    id: "3",
    title: "Strengthen relationships.",
    description:
      "Get personalized AI suggestions to reach out at exactly the right moment with the right message.",
    button: "Continue",
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width, height } = useWindowDimensions();

  const pageWidth = Math.min(width, 430);
  const isSmallScreen = height < 700;

  const handleNext = () => {
    const nextIndex = currentIndex + 1;

    if (nextIndex < slides.length) {
      setCurrentIndex(nextIndex);

      scrollRef.current?.scrollTo({
        x: nextIndex * pageWidth,
        animated: true,
      });
    } else {
      navigation.navigate("SignUp");
    }
  };

  const handleScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / pageWidth
    );

    setCurrentIndex(index);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.phoneFrame, { width: pageWidth }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
        >
          {slides.map((item) => (
            <View
              key={item.id}
              style={[
                styles.slide,
                {
                  width: pageWidth,
                  paddingTop: isSmallScreen ? 36 : 60,
                },
              ]}
            >
              <View style={styles.dots}>
                {slides.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      currentIndex === index && styles.activeDot,
                    ]}
                  />
                ))}
              </View>

              <Image
                source={require("../../assets/android-icon-background.png")}
                style={[
                  styles.image,
                  {
                    width: isSmallScreen ? 210 : 260,
                    height: isSmallScreen ? 210 : 260,
                  },
                ]}
                resizeMode="contain"
              />

              <Text style={styles.title}>{item.title}</Text>

              <Text style={styles.description}>{item.description}</Text>

              <View style={styles.buttonGlow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleNext}
                  style={styles.buttonWrapper}
                >
                  <LinearGradient
                    colors={["#A78BFA", "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>{item.button}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
                <Text style={styles.loginText}>
                  I already have an account
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    overflow: "hidden",
  },
  phoneFrame: {
    flex: 1,
    maxWidth: 430,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 40,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#BDBDBD",
  },
  activeDot: {
    width: 22,
    backgroundColor: "#8B5CF6",
  },
  image: {
    marginBottom: 36,
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#20202A",
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#9A9AA5",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 48,
    maxWidth: 340,
  },
  buttonGlow: {
    width: "100%",
    borderRadius: 15,
    marginBottom: 18,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  buttonWrapper: {
    borderRadius: 15,
    overflow: "hidden",
  },
  button: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loginText: {
    fontSize: 13,
    color: "#A0A0AA",
  },
});