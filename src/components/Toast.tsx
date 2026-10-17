import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

type Listener = (message: string) => void;

let listener: Listener | null = null;

export function showToast(message: string) {
  listener?.(message);
}

export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (msg: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(msg);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
          setMessage(null);
        });
      }, 2000);
    };
    return () => {
      listener = null;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [opacity]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrapper, { bottom: insets.bottom + 96, opacity }]}
    >
      <Text style={styles.text} numberOfLines={2}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 24,
    right: 24,
    alignItems: "center",
    zIndex: 999,
  },
  text: {
    backgroundColor: colors.text,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    overflow: "hidden",
    textAlign: "center",
  },
});
