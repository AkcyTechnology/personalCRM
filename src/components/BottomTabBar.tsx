import type { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import OrbitIcon from "./OrbitIcon";
import { warm, type as typeScale } from "../theme/warm";
import { colorScheme } from "../theme/colors";

/** Matches the Home screen's background (HomeScreen's local palette). */
const homeBg = colorScheme() === "dark" ? "#1B1915" : "#FAF8F2";
import { hapticTap } from "../utils/haptics";
import { t } from "../i18n";

type IconName = keyof typeof Ionicons.glyphMap;

export type Tab = "Home" | "People" | "Insights" | "Profile";

function TabItem({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon: (color: string) => ReactNode }) {
  const color = active ? warm.onSelectedSoft : warm.textSub;
  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={() => { if (!active) hapticTap(); onPress(); }}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.iconPill, active && styles.iconPillActive]}>{icon(color)}</View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const ion = (name: IconName, active: boolean) => (color: string) =>
  <Ionicons name={active ? (name.replace("-outline", "") as IconName) : name} size={22} color={color} />;

/**
 * Four labelled tabs in a light, thin-bordered capsule. The active tab's icon
 * sits on a small butter-yellow pill. There is no centre "+": adding a person
 * lives on the People and Home screens.
 */
export default function BottomTabBar({
  activeTab,
  onTabPress,
  variant = "default",
}: {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
  /** "home": the Home screen's warm background and squarer capsule. */
  variant?: "default" | "home";
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, variant === "home" && { backgroundColor: homeBg }, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.capsule, variant === "home" && styles.capsuleHome]} accessibilityRole="tablist">
        <TabItem label={t("Ana Sayfa")} active={activeTab === "Home"} onPress={() => onTabPress("Home")} icon={ion("home-outline", activeTab === "Home")} />
        <TabItem label={t("Kişiler")} active={activeTab === "People"} onPress={() => onTabPress("People")} icon={ion("people-outline", activeTab === "People")} />
        <TabItem
          label={t("Evren")}
          active={activeTab === "Insights"}
          onPress={() => onTabPress("Insights")}
          icon={(color) => <OrbitIcon color={color} filled={activeTab === "Insights"} />}
        />
        <TabItem label={t("Profil")} active={activeTab === "Profile"} onPress={() => onTabPress("Profile")} icon={ion("person-outline", activeTab === "Profile")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // No full-width rule above the bar: the capsule's own border is enough.
  wrapper: { backgroundColor: warm.bg, paddingHorizontal: 16, paddingTop: 8 },
  capsule: {
    flexDirection: "row",
    backgroundColor: warm.surface,
    borderWidth: 1,
    borderColor: warm.border,
    borderRadius: 28,
    paddingVertical: 6,
    paddingHorizontal: 6,
    ...Platform.select({
      ios: { shadowColor: warm.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  capsuleHome: { borderRadius: 16 },
  tabItem: { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 2 },
  iconPill: { width: 52, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconPillActive: { backgroundColor: warm.selectedSoft },
  tabLabel: { ...typeScale.tab, color: warm.textSub },
  tabLabelActive: { color: warm.primary, fontFamily: "InstrumentSans_600SemiBold" },
});
