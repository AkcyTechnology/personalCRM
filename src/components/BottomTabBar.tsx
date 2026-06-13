import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const PURPLE = "#7C6FE0";
const GRAY = "#9CA3AF";

// ---- Pure-View Icons (no react-native-svg dependency) ----

function HomeIcon({ color }: { color: string }) {
  return (
    <View style={iconStyles.homeWrap}>
      {/* roof triangle via borders */}
      <View style={[iconStyles.homeRoof, { borderBottomColor: color }]} />
      {/* building body */}
      <View style={[iconStyles.homeBody, { borderColor: color }]}>
        {/* door */}
        <View style={[iconStyles.homeDoor, { borderColor: color }]} />
      </View>
    </View>
  );
}

function PeopleIcon({ color }: { color: string }) {
  return (
    <View style={iconStyles.peopleWrap}>
      {/* back person (slightly offset) */}
      <View style={iconStyles.personBack}>
        <View style={[iconStyles.personHead, { borderColor: color }, iconStyles.personHeadSmall]} />
        <View style={[iconStyles.personBody, { borderColor: color }, iconStyles.personBodySmall]} />
      </View>
      {/* front person */}
      <View style={iconStyles.personFront}>
        <View style={[iconStyles.personHead, { borderColor: color }]} />
        <View style={[iconStyles.personBody, { borderColor: color }]} />
      </View>
    </View>
  );
}

function InsightsIcon({ color }: { color: string }) {
  return (
    <View style={iconStyles.insightsWrap}>
      <View style={[iconStyles.bar, { height: 9, backgroundColor: color }]} />
      <View style={[iconStyles.bar, { height: 14, backgroundColor: color }]} />
      <View style={[iconStyles.bar, { height: 18, backgroundColor: color }]} />
    </View>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <View style={iconStyles.profileWrap}>
      <View style={[iconStyles.profileHead, { borderColor: color }]} />
      <View style={[iconStyles.profileShoulder, { borderColor: color }]} />
    </View>
  );
}

const iconStyles = StyleSheet.create({
  // Home
  homeWrap: { width: 24, height: 24, alignItems: "center", justifyContent: "flex-end" },
  homeRoof: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginBottom: -1,
  },
  homeBody: {
    width: 14,
    height: 10,
    borderWidth: 1.8,
    borderTopWidth: 0,
    borderRadius: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  homeDoor: {
    width: 5,
    height: 6,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderRadius: 1,
    marginBottom: -1,
  },
  // People
  peopleWrap: { width: 24, height: 24, alignItems: "center", justifyContent: "flex-end" },
  personBack: { position: "absolute", bottom: 0, right: 0 },
  personFront: { alignItems: "center" },
  personHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.8,
    marginBottom: 1,
  },
  personHeadSmall: { width: 9, height: 9, borderRadius: 4.5 },
  personBody: {
    width: 14,
    height: 7,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    borderRadius: 7,
  },
  personBodySmall: { width: 12, height: 6 },
  // Insights
  insightsWrap: {
    width: 24,
    height: 24,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
  },
  bar: { width: 5, borderRadius: 2 },
  // Profile
  profileWrap: { width: 24, height: 24, alignItems: "center", justifyContent: "flex-end" },
  profileHead: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 1.8,
    marginBottom: 2,
  },
  profileShoulder: {
    width: 18,
    height: 8,
    borderWidth: 1.8,
    borderBottomWidth: 0,
    borderRadius: 9,
  },
});

// ---- Tab Item ----

type TabItemProps = {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
};

function TabItem({ label, icon, active, onPress }: TabItemProps) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.7}>
      {icon}
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---- BottomTabBar ----

export type Tab = "Home" | "People" | "Insights" | "Profile";

type Props = {
  activeTab: Tab;
  onTabPress: (tab: Tab) => void;
  onAddPress: () => void;
};

export default function BottomTabBar({ activeTab, onTabPress, onAddPress }: Props) {
  const insets = useSafeAreaInsets();

  const ic = (tab: Tab) => (activeTab === tab ? PURPLE : GRAY);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 8 }]}>
      <View style={styles.topBorder} />

      <View style={styles.row}>
        <TabItem
          label="Home"
          icon={<HomeIcon color={ic("Home")} />}
          active={activeTab === "Home"}
          onPress={() => onTabPress("Home")}
        />
        <TabItem
          label="People"
          icon={<PeopleIcon color={ic("People")} />}
          active={activeTab === "People"}
          onPress={() => onTabPress("People")}
        />

        {/* Center Add Button */}
        <View style={styles.addContainer}>
          <View style={styles.addGlow} />
          <TouchableOpacity onPress={onAddPress} activeOpacity={0.85} style={styles.addTouchable}>
            <LinearGradient
              colors={["#A89AF0", "#7C6FE0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addButton}
            >
              <Text style={styles.addIcon}>+</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TabItem
          label="Insights"
          icon={<InsightsIcon color={ic("Insights")} />}
          active={activeTab === "Insights"}
          onPress={() => onTabPress("Insights")}
        />
        <TabItem
          label="Profile"
          icon={<ProfileIcon color={ic("Profile")} />}
          active={activeTab === "Profile"}
          onPress={() => onTabPress("Profile")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#F0F0F5",
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
  addContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  addGlow: {
    position: "absolute",
    bottom: 6,
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#7C6FE0",
    opacity: 0.18,
    transform: [{ scale: 1.15 }],
  },
  addTouchable: {
    marginBottom: 8,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "300",
    lineHeight: 36,
    marginTop: -2,
  },
});
