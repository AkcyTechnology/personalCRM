import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

const HEADER_HEIGHT = 64;

export type AppHeaderType = "main" | "detail" | "settings";

export interface AppHeaderAction {
  label: string;
  color?: string;
  onPress: () => void;
}

export interface AppHeaderProps {
  type: AppHeaderType;
  title?: string;
  subtitle?: string;
  rightAction?: AppHeaderAction;
  onBack?: () => void;
  centerTitle?: string;
  rightActions?: AppHeaderAction[];
}

export default function AppHeader(props: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top;

  if (props.type === "main") {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={[styles.inner, styles.innerMain]}>
          <View style={styles.mainLeft}>
            <Text style={styles.mainTitle} numberOfLines={1}>{props.title ?? ""}</Text>
            {props.subtitle ? (
              <Text style={styles.mainSubtitle} numberOfLines={1}>{props.subtitle}</Text>
            ) : null}
          </View>
          {props.rightAction ? (
            <IconButton
              label={props.rightAction.label}
              color={props.rightAction.color}
              onPress={props.rightAction.onPress}
            />
          ) : null}
        </View>
      </View>
    );
  }

  if (props.type === "detail") {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={[styles.inner, styles.innerCentered]}>
          <BackButton onPress={props.onBack} />
          <Text style={styles.centerTitle} numberOfLines={1}>{props.centerTitle ?? ""}</Text>
          {props.rightActions && props.rightActions.length > 0 ? (
            <View style={styles.rightGroup}>
              {props.rightActions.map((a) => (
                <TextButton key={a.label} label={a.label} color={a.color} onPress={a.onPress} />
              ))}
            </View>
          ) : props.rightAction ? (
            <TextButton
              label={props.rightAction.label}
              color={props.rightAction.color}
              onPress={props.rightAction.onPress}
            />
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={[styles.inner, styles.innerCentered]}>
        <BackButton onPress={props.onBack} />
        <Text style={styles.centerTitle} numberOfLines={1}>{props.centerTitle ?? ""}</Text>
        <View style={styles.placeholder} />
      </View>
    </View>
  );
}

function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.backBtn}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Geri"
    >
      <Text style={styles.backIcon}>‹</Text>
      <Text style={styles.backLabel}>Geri</Text>
    </TouchableOpacity>
  );
}

function IconButton({ label, onPress }: { label: string; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.iconBtn}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={label === "+" || label === "＋" ? "Ekle" : label}
    >
      <Text style={{ fontSize: 22, color: "#FFFFFF", fontWeight: "300", lineHeight: 26, marginTop: -1 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function TextButton({ label, color, onPress }: { label: string; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={label === "+" || label === "＋" ? "Ekle" : label}
    >
      <Text style={[styles.textBtn, { color: color ?? colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EFF8",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: Platform.OS === "android" ? 2 : 0,
    zIndex: 10,
  },
  inner: {
    height: HEADER_HEIGHT,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  innerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mainLeft: {
    flex: 1,
    justifyContent: "center",
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.4,
  },
  mainSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "400",
    color: colors.textSub,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  innerCentered: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  centerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.2,
  },
  rightGroup: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    minWidth: 72,
    justifyContent: "flex-end",
  },
  placeholder: {
    minWidth: 72,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 72,
    gap: 2,
  },
  backIcon: {
    fontSize: 24,
    color: colors.primary,
    lineHeight: 28,
    marginTop: -1,
  },
  backLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.primary,
  },
  textBtn: {
    fontSize: 15,
    fontWeight: "500",
  },
});
