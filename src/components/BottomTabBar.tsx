import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";

const TEAL   = colors.primary;
const PURPLE = colors.primary;
const GRAY   = colors.textMuted;

// ── Icons ─────────────────────────────────────────────────────────────────────

function HomeIcon({ color }: { color: string }) {
  return (
    <View style={ic.homeWrap}>
      <View style={[ic.homeRoof, { borderBottomColor: color }]} />
      <View style={[ic.homeBody, { borderColor: color }]}>
        <View style={[ic.homeDoor, { borderColor: color }]} />
      </View>
    </View>
  );
}

function PeopleIcon({ color }: { color: string }) {
  return (
    <View style={ic.peopleWrap}>
      <View style={ic.personBack}>
        <View style={[ic.personHead, { borderColor: color }, ic.personHeadSm]} />
        <View style={[ic.personBody, { borderColor: color }, ic.personBodySm]} />
      </View>
      <View style={ic.personFront}>
        <View style={[ic.personHead, { borderColor: color }]} />
        <View style={[ic.personBody, { borderColor: color }]} />
      </View>
    </View>
  );
}

function InsightsIcon({ color }: { color: string }) {
  return (
    <View style={ic.insightsWrap}>
      <View style={[ic.bar, { height: 8,  backgroundColor: color }]} />
      <View style={[ic.bar, { height: 13, backgroundColor: color }]} />
      <View style={[ic.bar, { height: 18, backgroundColor: color }]} />
    </View>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <View style={ic.profileWrap}>
      <View style={[ic.profileHead,     { borderColor: color }]} />
      <View style={[ic.profileShoulder, { borderColor: color }]} />
    </View>
  );
}

const ic = StyleSheet.create({
  homeWrap:    { width: 24, height: 24, alignItems: "center", justifyContent: "flex-end" },
  homeRoof:    { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 9, borderLeftColor: "transparent", borderRightColor: "transparent", marginBottom: -1 },
  homeBody:    { width: 14, height: 10, borderWidth: 1.8, borderTopWidth: 0, borderRadius: 1, alignItems: "center", justifyContent: "flex-end" },
  homeDoor:    { width: 5, height: 6, borderWidth: 1.5, borderBottomWidth: 0, borderRadius: 1, marginBottom: -1 },

  peopleWrap:    { width: 24, height: 24, alignItems: "center", justifyContent: "flex-end" },
  personBack:    { position: "absolute", bottom: 0, right: 0 },
  personFront:   { alignItems: "center" },
  personHead:    { width: 10, height: 10, borderRadius: 5, borderWidth: 1.8, marginBottom: 1 },
  personHeadSm:  { width: 9, height: 9, borderRadius: 4.5 },
  personBody:    { width: 14, height: 7, borderWidth: 1.8, borderBottomWidth: 0, borderRadius: 7 },
  personBodySm:  { width: 12, height: 6 },

  insightsWrap: { width: 24, height: 24, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 3 },
  bar:          { width: 5, borderRadius: 2 },

  profileWrap:     { width: 24, height: 24, alignItems: "center", justifyContent: "flex-end" },
  profileHead:     { width: 11, height: 11, borderRadius: 5.5, borderWidth: 1.8, marginBottom: 2 },
  profileShoulder: { width: 18, height: 8, borderWidth: 1.8, borderBottomWidth: 0, borderRadius: 9 },
});

// ── Tab Item ──────────────────────────────────────────────────────────────────

function TabItem({ label, icon, active, onPress }: {
  label: string; icon: React.ReactNode; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {icon}
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
  const col = (tab: Tab) => activeTab === tab ? PURPLE : GRAY;

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 8 }]}>
      <View style={styles.topLine} />

      <View style={styles.row}>
        <TabItem label="Ana Sayfa" icon={<HomeIcon    color={col("Home")}    />} active={activeTab === "Home"}    onPress={() => onTabPress("Home")}    />
        <TabItem label="Kişiler"   icon={<PeopleIcon  color={col("People")}  />} active={activeTab === "People"}  onPress={() => onTabPress("People")}  />

        {/* Centre action button */}
        <View style={styles.addSlot}>
          <TouchableOpacity
            onPress={onAddPress}
            activeOpacity={0.82}
            style={styles.addBtn}
            accessibilityRole="button"
            accessibilityLabel="Yeni kişi ekle"
          >
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        </View>

        <TabItem label="Analiz" icon={<InsightsIcon color={col("Insights")} />} active={activeTab === "Insights"} onPress={() => onTabPress("Insights")} />
        <TabItem label="Profil" icon={<ProfileIcon  color={col("Profile")}  />} active={activeTab === "Profile"}  onPress={() => onTabPress("Profile")}  />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: radius.bottomBar,
    borderTopRightRadius: radius.bottomBar,
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
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
    backgroundColor: "#F0EFF8",
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
    fontSize: 11,
    fontWeight: "500",
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
        shadowColor: "#00B5AC",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 6 },
    }),
  },
  addIcon: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "200",
    lineHeight: 36,
    marginTop: -2,
    letterSpacing: -1,
  },
});
