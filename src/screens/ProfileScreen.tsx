import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { loadSettings, saveSettings } from "../data/userSettings";

const PURPLE = "#7C3AED";
const LIGHT_PURPLE = "#F1ECFF";
const BG = "#FAF9FF";
const CARD = "#FFFFFF";
const BORDER = "#ECE8F7";
const TEXT = "#191826";
const MUTED = "#8E8AA3";
const DANGER = "#EF4444";

const THRESHOLD_OPTIONS = [7, 14, 21, 30];

export default function ProfileScreen({ navigation }: any) {
  const [darkMode, setDarkMode]     = useState(false);
  const [modal, setModal]           = useState<string | null>(null);
  const [threshold, setThreshold]   = useState(14);
  const [thresholdOpen, setThresholdOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    loadSettings().then(s => setThreshold(s.reachOutThresholdDays));
  }, []));

  const handleThresholdSelect = async (val: number) => {
    setThreshold(val);
    setThresholdOpen(false);
    await saveSettings({ reachOutThresholdDays: val });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>T</Text>
          </View>

          <Text style={styles.name}>Tuğçe Yılmaz</Text>
          <Text style={styles.email}>tugce@email.com</Text>

          <View style={styles.statsRow}>
            <Stat value="4" label="Contacts" />
            <Stat value="23" label="Memories" />
            <Stat value="84" label="Health" />
          </View>
        </View>

        <TouchableOpacity
          style={styles.premiumCard}
          onPress={() => setModal("premium")}
        >
          <View style={styles.premiumIcon}>
            <Text style={styles.premiumIconText}>★</Text>
          </View>

          <View style={styles.premiumTextArea}>
            <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
            <Text style={styles.premiumDesc}>
              Unlock AI deep insights & more
            </Text>
          </View>

          <View style={styles.planButton}>
            <Text style={styles.planButtonText}>See plans</Text>
          </View>
        </TouchableOpacity>

        <Section title="Account" />

        <Card>
          <MenuItem
            icon="☻"
            title="Profile Settings"
            onPress={() => setModal("profile")}
          />
          <MenuItem
            icon="🔔"
            title="Notification Settings"
            onPress={() => setModal("notifications")}
          />
          <MenuItem
            icon="🛡"
            title="Privacy & Security"
            onPress={() => setModal("privacy")}
            last
          />
        </Card>

        <Section title="App" />

        <Card>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuBorder]}
            onPress={() => setThresholdOpen(true)}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>⏱</Text>
              </View>
              <View>
                <Text style={styles.menuTitle}>Ulaş Eşiği</Text>
                <Text style={styles.menuSub}>Son {threshold} günde görüşülmeyenler</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <MenuItem
            icon="⇩"
            title="Export Data"
            onPress={() => setModal("export")}
          />

          <View style={styles.switchRow}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Text style={styles.menuIconText}>◐</Text>
              </View>
              <Text style={styles.menuTitle}>Dark Mode</Text>
            </View>

            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#E5E1EF", true: "#C4B5FD" }}
              thumbColor={darkMode ? PURPLE : "#FFFFFF"}
            />
          </View>
        </Card>

        <Section title="Subscription" />

        <Card>
          <MenuItem
            icon="▣"
            title="Manage Subscription"
            onPress={() => setModal("subscription")}
          />
          <MenuItem
            icon="☆"
            title="Upgrade to Premium"
            onPress={() => setModal("premium")}
            last
          />
        </Card>

        <TouchableOpacity
          style={[styles.signOutButton, styles.signOutDisabled]}
          disabled
        >
          <Text style={[styles.signOutText, styles.signOutTextDisabled]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <ProfileModal
        visible={!!modal}
        type={modal}
        onClose={() => setModal(null)}
        onConfirm={() => {
          setModal(null);
          if (modal === "signout") navigation?.navigate?.("SignIn");
        }}
      />

      {/* Threshold Seçici */}
      <Modal visible={thresholdOpen} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setThresholdOpen(false)}>
          <Pressable style={styles.modalBox}>
            <Text style={styles.modalTitle}>Ulaş Eşiği</Text>
            <Text style={styles.modalDesc}>
              Kaç günde bir görüşülmeyenler "Ulaş" listesine girsin?
            </Text>
            {THRESHOLD_OPTIONS.map(val => (
              <TouchableOpacity
                key={val}
                style={[styles.thresholdOption, threshold === val && styles.thresholdOptionActive]}
                onPress={() => handleThresholdSelect(val)}
              >
                <Text style={[styles.thresholdOptionText, threshold === val && styles.thresholdOptionTextActive]}>
                  {val} gün
                </Text>
                {threshold === val && <Text style={styles.thresholdCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function MenuItem({
  icon,
  title,
  onPress,
  last,
}: {
  icon: string;
  title: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !last && styles.menuBorder]}
      onPress={onPress}
    >
      <View style={styles.menuLeft}>
        <View style={styles.menuIcon}>
          <Text style={styles.menuIconText}>{icon}</Text>
        </View>
        <Text style={styles.menuTitle}>{title}</Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}


function ProfileModal({
  visible,
  type,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  type: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const data = getModalContent(type);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalBox}>
          <View style={styles.modalIcon}>
            <Text style={styles.modalIconText}>{data.icon}</Text>
          </View>

          <Text style={styles.modalTitle}>{data.title}</Text>
          <Text style={styles.modalDesc}>{data.description}</Text>

          {data.items.map((item) => (
            <View key={item} style={styles.modalInfoRow}>
              <Text style={styles.modalBullet}>•</Text>
              <Text style={styles.modalInfoText}>{item}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={[
              styles.modalPrimaryButton,
              type === "signout" && styles.dangerButton,
            ]}
            onPress={onConfirm}
          >
            <Text style={styles.modalPrimaryText}>{data.primary}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}>
            <Text style={styles.modalSecondaryText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getModalContent(type: string | null) {
  switch (type) {
    case "profile":
      return {
        icon: "☻",
        title: "Profile Settings",
        description: "Update your name, email, avatar and personal details.",
        items: ["Edit profile photo", "Change display name", "Update email address"],
        primary: "Open settings",
      };
    case "notifications":
      return {
        icon: "🔔",
        title: "Notification Settings",
        description: "Control reminders, smart nudges and relationship alerts.",
        items: ["Birthday reminders", "Follow-up reminders", "Weekly summary"],
        primary: "Manage notifications",
      };
    case "privacy":
      return {
        icon: "🛡",
        title: "Privacy & Security",
        description: "Keep your personal CRM data safe and private.",
        items: ["Change password", "Two-factor authentication", "Data visibility"],
        primary: "Review privacy",
      };
    case "ai":
      return {
        icon: "✦",
        title: "AI Settings",
        description: "Customize how AI helps you remember and follow up.",
        items: ["Tone preferences", "Suggestion frequency", "Memory sensitivity"],
        primary: "Configure AI",
      };
    case "export":
      return {
        icon: "⇩",
        title: "Export Data",
        description: "Download your contacts, notes and memories.",
        items: ["CSV export", "JSON backup", "Email delivery"],
        primary: "Export now",
      };
    case "subscription":
      return {
        icon: "▣",
        title: "Manage Subscription",
        description: "View your current plan and billing details.",
        items: ["Current plan", "Billing history", "Cancel plan"],
        primary: "Manage plan",
      };
    case "premium":
      return {
        icon: "★",
        title: "Upgrade to Premium",
        description: "Unlock deeper AI insights for your relationships.",
        items: ["Unlimited memories", "Smart relationship health", "Advanced reminders"],
        primary: "See plans",
      };
    case "signout":
      return {
        icon: "!",
        title: "Sign Out?",
        description: "You can sign back in anytime with your account.",
        items: ["Unsynced local changes may be lost"],
        primary: "Sign out",
      };
    default:
      return {
        icon: "✦",
        title: "Settings",
        description: "Manage your account preferences.",
        items: [],
        primary: "Continue",
      };
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingTop: 58,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  profileHeader: {
    alignItems: "center",
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#9B7CFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
  },
  name: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "800",
    color: TEXT,
  },
  email: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
  },
  statsRow: {
    marginTop: 20,
    width: "80%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "900",
    color: TEXT,
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    color: MUTED,
  },
  premiumCard: {
    marginTop: 28,
    backgroundColor: "#9B7CFF",
    borderRadius: 18,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  premiumIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  premiumIconText: {
    color: "#FFFFFF",
    fontSize: 17,
  },
  premiumTextArea: {
    flex: 1,
  },
  premiumTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  premiumDesc: {
    color: "#EFEAFF",
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  planButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  planButtonText: {
    color: PURPLE,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "800",
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  menuItem: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  menuIconText: {
    color: PURPLE,
    fontSize: 14,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
  },
  chevron: {
    fontSize: 24,
    color: MUTED,
  },
  switchRow: {
    minHeight: 62,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  signOutButton: {
    marginTop: 26,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FFF1F1",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutDisabled: {
    opacity: 0.4,
  },
  signOutText: {
    color: DANGER,
    fontSize: 14,
    fontWeight: "800",
  },
  signOutTextDisabled: {
    color: DANGER,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(25, 24, 38, 0.36)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 24,
  },
  modalIcon: {
    alignSelf: "center",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: LIGHT_PURPLE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalIconText: {
    color: PURPLE,
    fontSize: 24,
    fontWeight: "800",
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: TEXT,
    textAlign: "center",
  },
  modalDesc: {
    marginTop: 8,
    fontSize: 14,
    color: MUTED,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 18,
  },
  modalInfoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  modalBullet: {
    color: PURPLE,
    marginRight: 8,
    fontSize: 16,
  },
  modalInfoText: {
    flex: 1,
    color: "#514D67",
    fontSize: 14,
  },
  modalPrimaryButton: {
    marginTop: 18,
    height: 50,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButton: {
    backgroundColor: DANGER,
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  modalSecondaryButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "700",
  },
  menuSub: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  thresholdOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8F7FF",
    borderWidth: 1,
    borderColor: "#ECE8F7",
  },
  thresholdOptionActive: {
    backgroundColor: "#EDE9FF",
    borderColor: PURPLE,
  },
  thresholdOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4A4566",
  },
  thresholdOptionTextActive: {
    color: PURPLE,
    fontWeight: "800",
  },
  thresholdCheck: {
    fontSize: 16,
    color: PURPLE,
    fontWeight: "700",
  },
});