import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, type StyleProp, type TextStyle } from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";

/** A number that counts up to `value` (from the last shown value) in ~300 ms. */
export default function CountUp({ value, style, format = String }: { value: number; style?: StyleProp<TextStyle>; format?: (n: number) => string }) {
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(value);
      setShown(value);
      return;
    }
    const id = anim.addListener(({ value: v }) => setShown(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [anim, reduceMotion, value]);

  return <Text style={style}>{format(shown)}</Text>;
}
