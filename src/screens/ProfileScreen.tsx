import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { loadSettings, saveSettings, updateSettings } from "../data/userSettings";
import { runExportBackup, runRestoreBackup } from "../data/backupActions";
import { GOALS } from "../data/goals";
import { isDue } from "../utils/reminderInterval";
import { loadContacts } from "../data/contacts";
import type { ContactForm } from "./AddContactScreen";
import { averageHealthScore, healthScoreColor } from "../utils/healthScore";
import HealthInfoModal from "../components/HealthInfoModal";
import { colors } from "../theme/colors";

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAL      = colors.primary;
const TEAL_SOFT = colors.primarySoft;
const TEAL_DARK = colors.primaryDark;
const TEXT      = colors.text;
const TEXTSUB   = colors.textSub;
const TEXTMUTED = colors.textMuted;
const BORDER    = colors.border;
const BORDER_SOFT = colors.borderLight;
const BG        = colors.white;
const CARD      = colors.white;
const DANGER    = colors.danger;

const THRESHOLD_OPTIONS = [7, 14, 21, 30];

const TOP_SAFE = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 48;

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysSince(iso?: string) {
  if (!iso) return 999;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?";
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top + 8 : TOP_SAFE;

  const [threshold,      setThreshold]      = useState(14);
  const [thresholdOpen,  setThresholdOpen]  = useState(false);
  const [goals,          setGoals]          = useState<string[]>([]);
  const [userName,       setUserName]       = useState("");
  const [email,          setEmail]          = useState("");
  const [contactsList,   setContactsList]   = useState<ContactForm[]>([]);
  const [totalContacts,  setTotalContacts]  = useState(0);
  const [weeklyContacts, setWeeklyContacts] = useState(0);
  const [needsAttention, setNeedsAttention] = useState(0);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadSettings(), loadContacts()]).then(([s, contacts]) => {
        const t = s.reachOutThresholdDays || 14;
        setThreshold(t);
        setUserName(s.userName || "");
        setEmail(s.email || "");
        setGoals(s.goals || []);
        setContactsList(contacts);
        setTotalContacts(contacts.length);
        setWeeklyContacts(contacts.filter(c => daysSince(c.lastContactDate) <= 7).length);
        setNeedsAttention(contacts.filter(c => isDue(c, t)).length);
      });
    }, [])
  );

  const handleThresholdSelect = async (val: number) => {
    setThreshold(val);
    setThresholdOpen(false);
    const s = await loadSettings();
    await saveSettings({ ...s, reachOutThresholdDays: val });
    const contacts = await loadContacts();
    setContactsList(contacts);
    setNeedsAttention(contacts.filter(c => isDue(c, val)).length);
  };

  const toggleGoal = async (key: string) => {
    const next = goals.includes(key) ? goals.filter(g => g !== key) : [...goals, key];
    setGoals(next);
    await updateSettings({ goals: next });
  };

  const reload = async () => {
    const contacts = await loadContacts();
    setContactsList(contacts);
    setTotalContacts(contacts.length);
    setWeeklyContacts(contacts.filter(c => daysSince(c.lastContactDate) <= 7).length);
    setNeedsAttention(contacts.filter(c => isDue(c, threshold)).length);
  };

  const health = averageHealthScore(contactsList, threshold);
  const healthColor = healthScoreColor(health);

  return (
    <View style={styles.screen}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials(userName)}</Text>
          </View>

          {/* Name + email */}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{userName || "Profil"}</Text>
            <Text style={styles.headerEmail} numberOfLines={1}>{email || "Hesap ayarları"}</Text>
          </View>

          {/* Edit button */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("ProfileSettings")}
            activeOpacity={0.8}
          >
            <Text style={styles.editBtnText}>Düzenle</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <StatCard value={totalContacts}  label="Toplam kişi" />
          <StatCard value={weeklyContacts} label="Bu hafta" />
          <StatCard value={needsAttention} label="Bekleyen" danger={needsAttention > 0} />
        </View>

        {/* ── Health bar ── */}
        <View style={styles.healthCard}>
          <View style={styles.healthLeft}>
            <View style={styles.healthLabelRow}>
              <Text style={styles.healthLabel}>İlişki Sağlığı</Text>
              <TouchableOpacity onPress={() => setHealthInfoOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textSub} accessibilityLabel="İlişki sağlığı nasıl hesaplanır?" />
              </TouchableOpacity>
            </View>
            <Text style={styles.healthSub}>Bağlantı genel durumu</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${health}%` as any, backgroundColor: healthColor }]} />
            </View>
          </View>
          <View style={styles.healthRight}>
            <Text style={[styles.healthScore, { color: healthColor }]}>{health}</Text>
            <Text style={styles.healthSuffix}>/100</Text>
          </View>
        </View>

        {/* ── Hesap ── */}
        <SectionLabel title="Hesap" />

        <View style={styles.card}>
          <RowItem
            icon={<PersonIcon />}
            title="Profil Ayarları"
            sub="Ad, e-posta ve profil bilgileri"
            onPress={() => navigation.navigate("ProfileSettings")}
          />
          <RowItem
            icon={<BellIcon />}
            title="Bildirim Ayarları"
            sub="Hatırlatma ve bildirim tercihleri"
            onPress={() => navigation.navigate("NotificationSettings")}
          />
          <RowItem
            icon={<ShieldIcon />}
            title="Gizlilik ve Güvenlik"
            sub="Veri ve güvenlik kontrolleri"
            onPress={() => navigation.navigate("PrivacySecurity")}
          />
          <RowItem
            icon={<StarIcon />}
            title="Abonelik"
            sub="Beta · tüm özellikler ücretsiz"
            onPress={() => navigation.navigate("ManageSubscription")}
            last
          />
        </View>

        {/* ── Uygulama ── */}
        <SectionLabel title="Uygulama" />

        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.rowItem, styles.rowBorder]}
            onPress={() => setThresholdOpen(true)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, { backgroundColor: TEAL_SOFT }]}>
              <ClockIcon />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Ulaş Eşiği</Text>
              <Text style={styles.rowSub}>Son {threshold} günde görüşülmeyenler</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{threshold}g</Text>
            </View>
          </TouchableOpacity>


          <TouchableOpacity
            style={[styles.rowItem, styles.rowBorder]}
            onPress={() => navigation.navigate("ImportContacts")}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.iconWrap, { backgroundColor: TEAL_SOFT }]}>
              <UploadIcon />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Kişileri içe aktar</Text>
              <Text style={styles.rowSub}>Rehberden kişi aktar</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, styles.rowBorder]}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "Onboarding" }] })}
            activeOpacity={0.75}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <RestartIcon />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Onboarding'i tekrar göster</Text>
              <Text style={styles.rowSub}>Tanıtım ekranlarını yeniden izle</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, styles.rowBorder]}
            onPress={runExportBackup}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.iconWrap, { backgroundColor: "#F0FDF4" }]}>
              <DownloadIcon />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Yedek al</Text>
              <Text style={styles.rowSub}>Tüm verileri .json dosyası olarak kaydet</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowItem}
            onPress={() => runRestoreBackup(reload)}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.iconWrap, { backgroundColor: TEAL_SOFT }]}>
              <UploadIcon />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Yedekten geri yükle</Text>
              <Text style={styles.rowSub}>Daha önce aldığın yedeği içe aktar</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Veri Özeti ── */}
        <SectionLabel title="Veri Özeti" />

        <View style={styles.card}>
          <DataRow label="Toplam kişi"         value={`${totalContacts}`} />
          <DataRow label="Bu hafta iletişim"    value={`${weeklyContacts}`} />
          <DataRow label="Ulaşılması gereken"   value={`${needsAttention}`} />
          <DataRow label="Ulaş eşiği"           value={`${threshold} gün`} last />
        </View>

        {/* ── Hedefler ── */}
        <SectionLabel title="Hedeflerin" />

        <View style={[styles.card, styles.goalsCard]}>
          {GOALS.map(g => {
            const active = goals.includes(g.key);
            return (
              <TouchableOpacity
                key={g.key}
                style={[styles.goalChip, active && styles.goalChipActive]}
                onPress={() => toggleGoal(g.key)}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
              >
                <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>{g.icon} {g.short}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* ── Threshold modal ── */}
      <PickerModal
        visible={thresholdOpen}
        title="Ulaş Eşiği"
        desc="Kaç gün görüşülmeyenler listeye girsin?"
        onClose={() => setThresholdOpen(false)}
      >
        {THRESHOLD_OPTIONS.map(val => (
          <PickerOption
            key={val}
            label={`${val} gün`}
            active={threshold === val}
            onPress={() => handleThresholdSelect(val)}
          />
        ))}
      </PickerModal>

      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function StatCard({ value, label, danger }: { value: number; label: string; danger?: boolean }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, danger && { color: DANGER }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RowItem({
  icon, title, sub, onPress, last,
}: {
  icon: React.ReactNode; title: string; sub?: string; onPress: () => void; last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.rowItem, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: TEAL_SOFT }]}>{icon}</View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function DataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.dataRow, !last && styles.rowBorder]}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

function PickerModal({
  visible, title, desc, onClose, children,
}: {
  visible: boolean; title: string; desc: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalBox}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalDesc}>{desc}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PickerOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.optionRow, active && styles.optionActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text>
      {active && <Text style={styles.optionCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

// ── Inline icons ──────────────────────────────────────────────────────────────

const ic = { color: TEAL, size: 16 };

function PersonIcon() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: ic.color }} />
      <View style={{ width: 13, height: 6, borderWidth: 1.5, borderBottomWidth: 0, borderRadius: 6, borderColor: ic.color, marginTop: 2 }} />
    </View>
  );
}

function BellIcon() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 12, height: 11, borderRadius: 5, borderWidth: 1.5, borderColor: ic.color }} />
      <View style={{ width: 5, height: 2, borderRadius: 1, backgroundColor: ic.color, marginTop: 1 }} />
    </View>
  );
}

function ShieldIcon() {
  return (
    <View style={{ width: 13, height: 15, borderWidth: 1.5, borderColor: ic.color, borderRadius: 4, borderTopLeftRadius: 6, borderTopRightRadius: 6, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ic.color }} />
    </View>
  );
}

function StarIcon() {
  return (
    <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: ic.color, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ic.color }} />
    </View>
  );
}

function ClockIcon() {
  return (
    <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: ic.color, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 1.5, height: 4, backgroundColor: ic.color, position: "absolute", top: 2, borderRadius: 1 }} />
      <View style={{ width: 3, height: 1.5, backgroundColor: ic.color, position: "absolute", right: 3, borderRadius: 1 }} />
    </View>
  );
}

function DownloadIcon() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 1.5, height: 8, backgroundColor: colors.success, borderRadius: 1 }} />
      <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 5, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: colors.success, marginTop: -1 }} />
      <View style={{ width: 12, height: 1.5, backgroundColor: colors.success, marginTop: 2, borderRadius: 1 }} />
    </View>
  );
}

function UploadIcon() {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 5, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: TEAL, marginBottom: -1 }} />
      <View style={{ width: 1.5, height: 8, backgroundColor: TEAL, borderRadius: 1 }} />
      <View style={{ width: 12, height: 1.5, backgroundColor: TEAL, marginTop: 2, borderRadius: 1 }} />
    </View>
  );
}

function RestartIcon() {
  return (
    <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.accent, borderTopColor: "transparent", alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 4, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: colors.accent, position: "absolute", top: -3, right: -1 }} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  goalsCard: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 14 },
  goalChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: BORDER, backgroundColor: BG,
  },
  goalChipActive: { borderColor: TEAL, backgroundColor: TEAL_SOFT },
  goalChipText: { fontSize: 14, color: TEXTSUB, fontWeight: "600" },
  goalChipTextActive: { color: TEAL_DARK },
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: BG,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 2 },
    }),
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: TEAL_SOFT,
    borderWidth: 1.5, borderColor: TEAL + "40",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: TEAL_DARK },
  headerInfo: { flex: 1 },
  headerName:  { fontSize: 17, fontWeight: "700", color: TEXT, letterSpacing: -0.2 },
  headerEmail: { marginTop: 2, fontSize: 12, color: TEXTSUB },
  editBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, backgroundColor: TEAL_SOFT,
    borderWidth: 1, borderColor: TEAL + "40",
  },
  editBtnText: { fontSize: 13, fontWeight: "600", color: TEAL_DARK },

  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: CARD,
    borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    }),
  },
  statValue: { fontSize: 22, fontWeight: "700", color: TEXT },
  statLabel: { marginTop: 3, fontSize: 11, color: TEXTSUB, fontWeight: "500" },

  // Health bar
  healthCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 14,
    marginBottom: 4,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    }),
  },
  healthLeft: { flex: 1, marginRight: 16 },
  healthLabel: { fontSize: 13, fontWeight: "700", color: TEXT },
  healthLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  healthInfoIcon: { fontSize: 12, color: TEXTMUTED },
  healthSub:   { fontSize: 11, color: TEXTSUB, marginTop: 2 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.borderLight, marginTop: 10, overflow: "hidden" },
  barFill:  { height: 6, borderRadius: 3 },
  healthRight: { flexDirection: "row", alignItems: "flex-end" },
  healthScore:  { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  healthSuffix: { fontSize: 12, color: TEXTMUTED, fontWeight: "400", marginBottom: 3 },

  // Section label
  sectionLabel: {
    marginTop: 22, marginBottom: 8,
    fontSize: 11, fontWeight: "700", color: TEXTMUTED,
    textTransform: "uppercase", letterSpacing: 0.7,
  },

  // Card
  card: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    }),
  },

  // Row item
  rowItem: {
    minHeight: 58, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER_SOFT },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "500", color: TEXT },
  rowSub:   { fontSize: 11, color: TEXTSUB, marginTop: 2, lineHeight: 15 },
  chevron:  { fontSize: 20, color: TEXTMUTED },

  // Pill
  pill: {
    backgroundColor: TEAL_SOFT, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  pillText: { fontSize: 11, fontWeight: "600", color: TEAL_DARK },

  // Data row
  dataRow: {
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  dataLabel: { fontSize: 13, color: TEXTSUB, fontWeight: "400" },
  dataValue: { fontSize: 13, fontWeight: "600", color: TEXT },

  // Sign out

  // Modal
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalBox: {
    width: "100%", maxWidth: 380,
    backgroundColor: CARD, borderRadius: 18, padding: 22,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 12 },
    }),
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: TEXT, textAlign: "center" },
  modalDesc:  { marginTop: 5, fontSize: 13, color: TEXTSUB, textAlign: "center", lineHeight: 19, marginBottom: 16 },
  optionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: 12, marginBottom: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: BORDER,
  },
  optionActive:    { backgroundColor: TEAL_SOFT, borderColor: TEAL + "60" },
  optionText:      { fontSize: 15, fontWeight: "500", color: TEXT },
  optionTextActive:{ color: TEAL_DARK, fontWeight: "700" },
  optionCheck:     { fontSize: 15, color: TEAL, fontWeight: "700" },
});
