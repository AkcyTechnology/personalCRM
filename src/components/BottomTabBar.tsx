import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import Ionicons from "@expo/vector-icons/Ionicons";
import { hapticImpact, hapticTap } from "../utils/haptics";
import { t } from "../i18n";

const TEAL   = colors.primary;
const PURPLE = colors.primary;
const GRAY   = colors.textSub;

// ── Tab Item ──────────────────────────────────────────────────────────────────

type IconName = keyof typeof Ionicons.glyphMap;

function TabItem({ label, icon, active, onPress }: {
  label: string; icon: IconName; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={() => { if (!active) hapticTap(); onPress(); }}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Ionicons name={active ? (icon.replace("-outline", "") as IconName) : icon} size={24} color={active ? PURPLE : GRAY} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── BottomTabBar ──────────────────────────────────────────────────────────────

export type Tab = "Home" | "People" | "Insights" | "Profile";

type Props = {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
  onAddPress: () => void;
};

export default function BottomTabBar({ activeTab, onTabPress, onAddPress }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 8 }]}>
      <View style={styles.topLine} />

      <View style={styles.row}>
        <TabItem label={t("Ana Sayfa")} icon="home-outline"   active={activeTab === "Home"}   onPress={() => onTabPress("Home")} />
        <TabItem label={t("Kişiler")}   icon="people-outline" active={activeTab === "People"} onPress={() => onTabPress("People")} />

        {/* Centre action button */}
        <View style={styles.addSlot}>
          <TouchableOpacity
            onPress={() => { hapticImpact(); onAddPress(); }}
            activeOpacity={0.82}
            style={styles.addBtn}
            accessibilityRole="button"
            accessibilityLabel={t("Yeni kişi ekle")}
          >
            <Ionicons name="add" size={34} color={colors.onFill} />
          </TouchableOpacity>
        </View>

        <TabItem label={t("Evren")}  icon="planet-outline" active={activeTab === "Insights"} onPress={() => onTabPress("Insights")} />
        <TabItem label={t("Profil")} icon="person-outline" active={activeTab === "Profile"}  onPress={() => onTabPress("Profile")} />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.bottomBar,
    borderTopRightRadius: radius.bottomBar,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  topLine: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: colors.borderLight,
    borderRadius: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    gap: 4,
    minHeight: 56,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: GRAY,
  },
  tabLabelActive: {
    color: PURPLE,
    fontWeight: "600",
  },

  // Centre slot lifts the button above the bar
  addSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  addBtn: {
    width: 64,
    height: 64,
    borderRadius: radius.fab,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    // lift above bar baseline
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
});
