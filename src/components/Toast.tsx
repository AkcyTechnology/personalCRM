import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

type ToastOptions = {
  /** Label of an inline action, e.g. "Geri al". */
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

type Toast = { message: string } & ToastOptions;
type Listener = (toast: Toast) => void;

let listener: Listener | null = null;

export function showToast(message: string, options: ToastOptions = {}) {
  listener?.({ message, ...options });
}

/** Toast with a "Geri al" button for reversible actions. */
export function showUndoToast(message: string, onUndo: () => void) {
  showToast(message, { actionLabel: "Geri al", onAction: onUndo, durationMs: 5000 });
}

export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Each toast gets an id so a fade-out that finishes late cannot clear a newer toast.
  const currentId = useRef(0);

  const hide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const id = currentId.current;
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished && currentId.current === id) setToast(null);
    });
  };

  useEffect(() => {
    listener = (next: Toast) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      currentId.current += 1;
      opacity.stopAnimation();
      setToast(next);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(hide, next.durationMs ?? (next.actionLabel ? 5000 : 2200));
    };
    return () => {
      listener = null;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opacity]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom + 96, opacity }]}
    >
      <View style={styles.pill} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Text style={styles.text} numberOfLines={2}>{toast.message}</Text>
        {toast.actionLabel && toast.onAction ? (
          <TouchableOpacity
            onPress={() => {
              toast.onAction?.();
              hide();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
          >
            <Text style={styles.action}>{toast.actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 999,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.text,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.pill,
    maxWidth: 480,
  },
  text: {
    flexShrink: 1,
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  action: {
    color: "#5EEAD4",
    fontSize: 14,
    fontWeight: "800",
  },
});
