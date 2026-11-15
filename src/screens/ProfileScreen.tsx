import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { loadSettings } from "../data/userSettings";
import { t } from "../i18n";
import { loadContacts } from "../data/contacts";
import type { ContactForm } from "./AddContactScreen";
import { hasAnyHistory } from "../utils/stats";
import HealthInfoModal from "../components/HealthInfoModal";
import Avatar from "../components/Avatar";
import ProfileInsights from "../components/ProfileInsights";
import { colors } from "../theme/colors";

const TOP_SAFE = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 48;

/**
 * Profile: who you are, then İçgörüler (weekly goal first), then a link to
 * Hesap ayarları. Every number appears once on this page.
 */
export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top + 8 : TOP_SAFE;

  const [loaded, setLoaded] = useState(false);
  const [threshold, setThreshold] = useState(14);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [userAvatarId, setUserAvatarId] = useState<string | undefined>(undefined);
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadSettings(), loadContacts()]).then(([s, list]) => {
        setThreshold(s.reachOutThresholdDays || 14);
        setWeeklyGoal(s.weeklyGoal || 3);
        setUserName(s.userName || "");
        setEmail(s.email || "");
        setUserAvatarId(s.userAvatarId);
        setContacts(list);
        setLoaded(true);
      });
    }, [])
  );

  const known = useMemo(() => hasAnyHistory(contacts), [contacts]);

  return (
    <View style={styles.screen}>
      {/* ── Profile ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <Avatar name={userName} avatarId={userAvatarId} size={52} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1} accessibilityRole="header">{userName || t("Profil")}</Text>
            {email ? <Text style={styles.headerEmail} numberOfLines={1}>{email}</Text> : null}
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("ProfileSettings")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("Profili düzenle")}
          >
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {!loaded ? null : contacts.length === 0 ? (
          /* No people yet: one short empty state instead of zero cards. */
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={24} color={colors.textSub} />
            <View style={{ flex: 1 }}>
              <Text style={styles.emptyTitle}>{t("Henüz kişi eklemedin")}</Text>
              <Text style={styles.emptyText}>{t("İlk kişini eklediğinde özetlerin ve içgörülerin burada görünür.")}</Text>
            </View>
            <TouchableOpacity style={styles.smallBtn} onPress={() => navigation.navigate("AddContact")} accessibilityRole="button">
              <Text style={styles.smallBtnText}>{t("Kişi ekle")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Total people: shown once, here. */}
            <Text style={styles.summary}>
              {t("{count} kişi kayıtlı", { count: contacts.length })}
              {known ? "" : ` · ${t("Görüşme kaydettikçe haftalık hedef ve bağlarının durumu dolacak.")}`}
            </Text>
            <Text style={styles.sectionTitle} accessibilityRole="header">{t("İçgörüler")}</Text>
            <ProfileInsights
              contacts={contacts}
              threshold={threshold}
              weeklyGoal={weeklyGoal}
              onOpenPerson={(c: ContactForm) => navigation.navigate("PersonDetail", { contact: c })}
              onOpenHealthInfo={() => setHealthInfoOpen(true)}
            />
          </>
        )}

        {/* ── Account settings ── */}
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => navigation.navigate("AccountSettings")}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t("Hesap ayarları")}
          accessibilityHint={t("Bildirimler, gizlilik, kullanım amaçları, dil, görünüm ve yedekler")}
        >
          <View style={styles.settingsIcon}>
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.settingsInfo}>
            <Text style={styles.settingsTitle}>{t("Hesap ayarları")}</Text>
            <Text style={styles.settingsSub}>{t("Bildirimler, gizlilik, kullanım amaçları, dil, görünüm ve yedekler")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />
    </View>
  );
}

const card = {
  backgroundColor: colors.surface,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerInfo: { flex: 1, minWidth: 0 },
  headerName: { fontSize: 20, lineHeight: 26, fontWeight: "600", color: colors.text },
  headerEmail: { marginTop: 1, fontSize: 13, lineHeight: 18, color: colors.textSub },
  editBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },

  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 },

  summary: { fontSize: 14, lineHeight: 20, color: colors.textSub },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.text, marginTop: 12, marginBottom: 8 },

  emptyCard: { ...card, flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  emptyTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.text },
  emptyText: { fontSize: 13, lineHeight: 18, color: colors.textSub, marginTop: 2 },
  smallBtn: { minHeight: 48, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  smallBtnText: { fontSize: 14, fontWeight: "600", color: colors.onFill },

  settingsRow: { ...card, marginTop: 24, minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  settingsInfo: { flex: 1, minWidth: 0 },
  settingsTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.text },
  settingsSub: { fontSize: 13, lineHeight: 18, color: colors.textSub },
});
