import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PURPLE = "#7C3AED";
const BG = "#FAF9FF";
const CARD = "#FFFFFF";
const BORDER = "#ECE8F7";
const TEXT = "#191826";
const MUTED = "#8E8AA3";
const RED = "#EF4444";
const ORANGE = "#F59E0B";

const priority = [
  {
    name: "James Mitchell",
    detail: "2 weeks since last contact",
    tag: "Today",
    type: "Reconnect",
    icon: "↔",
    color: PURPLE,
  },
  {
    name: "Priya Sharma",
    detail: "Weekly family check-in",
    tag: "Tomorrow",
    type: "Family",
    icon: "♡",
    color: RED,
  },
];

const upcoming = [
  { name: "Priya Sharma", detail: "Her 32nd birthday", date: "June 14", left: "in 22d", initials: "PS" },
  { name: "Sarah Chen", detail: "Follow up on her new project launch", date: "May 30", left: "in 7d", initials: "SC" },
  { name: "Marcus Webb", detail: "Monthly catchup call", date: "June 1", left: "in 9d", initials: "MW" },
];

export default function RemindersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reminders</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addText}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Priority</Text>

        {priority.map((item) => (
          <TouchableOpacity key={item.name} style={[styles.priorityCard, { borderLeftColor: item.color }]}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + "15" }]}>
              <Text style={[styles.iconText, { color: item.color }]}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDesc}>{item.detail}</Text>
            </View>
            <View style={styles.rightArea}>
              <Text style={[styles.dueTag, item.tag === "Today" && styles.todayTag]}>{item.tag}</Text>
              <Text style={styles.typeText}>{item.type}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Upcoming</Text>

        {upcoming.map((item) => (
          <TouchableOpacity key={item.name} style={styles.upcomingCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardDesc}>{item.detail}</Text>
            </View>
            <View style={styles.dateArea}>
              <Text style={styles.dateText}>{item.date}</Text>
              <Text style={styles.leftText}>{item.left}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center", marginRight: 8,
  },
  backText: { fontSize: 30, color: PURPLE },
  title: { flex: 1, fontSize: 26, fontWeight: "900", color: TEXT },
  addButton: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#9B7CFF", alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  addText: { color: "#FFFFFF", fontSize: 24, fontWeight: "800" },
  content: { paddingHorizontal: 22, paddingBottom: 40 },
  sectionLabel: {
    marginTop: 10, marginBottom: 12,
    fontSize: 12, color: MUTED, fontWeight: "900",
    textTransform: "uppercase", letterSpacing: 0.8,
  },
  priorityCard: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, borderLeftWidth: 4,
    padding: 16, marginBottom: 12,
    flexDirection: "row", alignItems: "center",
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  iconText: { fontSize: 18, fontWeight: "900" },
  cardTitle: { fontSize: 14, fontWeight: "900", color: TEXT },
  cardDesc: { marginTop: 4, fontSize: 12, color: MUTED },
  rightArea: { alignItems: "flex-end" },
  dueTag: {
    backgroundColor: "#F1ECFF", color: PURPLE,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, fontSize: 11, fontWeight: "800", overflow: "hidden",
  },
  todayTag: { backgroundColor: "#FFF1F1", color: RED },
  typeText: { marginTop: 8, color: PURPLE, fontSize: 11, fontWeight: "800" },
  upcomingCard: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    padding: 16, marginBottom: 12,
    flexDirection: "row", alignItems: "center",
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#FFF1D6", alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  avatarText: { color: ORANGE, fontWeight: "900", fontSize: 13 },
  dateArea: { alignItems: "flex-end" },
  dateText: { color: TEXT, fontSize: 13, fontWeight: "900" },
  leftText: { marginTop: 5, color: ORANGE, fontSize: 11, fontWeight: "700" },
});
