import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";

/** Fades and lifts its children in once, 50 ms after the previous `index`. */
export default function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReduceMotion();
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: 260, delay: index * 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [index, reduceMotion, v]);

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
