import { useState, useCallback, useMemo } from "react";
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
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { loadSettings, saveSettings, updateSettings } from "../data/userSettings";
import { runExportBackup, runRestoreBackup } from "../data/backupActions";
import { GOALS } from "../data/goals";
import { t } from "../i18n";
import { loadContacts } from "../data/contacts";
import type { ContactForm } from "./AddContactScreen";
import { connectionStatus, healthScoreColor, healthScoreLabel, MIN_SCORED_PEOPLE } from "../utils/healthScore";
import { dueContacts, weekStats } from "../utils/stats";
import HealthInfoModal from "../components/HealthInfoModal";
import { colors, colorScheme } from "../theme/colors";
import { showToast } from "../components/Toast";
import Avatar from "../components/Avatar";
import { hapticTap } from "../utils/haptics";

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAL      = colors.primary;
const TEAL_SOFT = colors.primarySoft;
const TEAL_DARK = colors.primaryDark;
const TEXT      = colors.text;
const TEXTSUB   = colors.textSub;
const TEXTMUTED = colors.textMuted;
const BORDER    = colors.border;
const BORDER_SOFT = colors.borderLight;
const BG        = colors.bg;
const CARD      = colors.surface;
const DANGER    = colors.danger;

const THRESHOLD_OPTIONS = [7, 14, 21, 30];

const TOP_SAFE = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 48;

// ── Helpers ───────────────────────────────────────────────────────────────────


// ── Screen ────────────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top + 8 : TOP_SAFE;

  const [threshold,      setThreshold]      = useState(14);
  const [thresholdOpen,  setThresholdOpen]  = useState(false);
  const [goalOpen,       setGoalOpen]       = useState(false);
  const [languageOpen,   setLanguageOpen]   = useState(false);
  const [weeklyGoal,     setWeeklyGoal]     = useState(3);
  const [language,       setLanguage]       = useState<"system" | "tr" | "en">("system");
  const [themeOpen,      setThemeOpen]      = useState(false);
  const [theme,          setTheme]          = useState<"system" | "light" | "dark">("system");
  const [haptics,        setHaptics]        = useState(true);
  const [goals,          setGoals]          = useState<string[]>([]);
  const [userName,       setUserName]       = useState("");
  const [email,          setEmail]          = useState("");
  const [userAvatarId,   setUserAvatarId]   = useState<string | undefined>(undefined);
  const [contactsList,   setContactsList]   = useState<ContactForm[]>([]);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadSettings(), loadContacts()]).then(([s, contacts]) => {
        const t = s.reachOutThresholdDays || 14;
        setThreshold(t);
        setUserName(s.userName || "");
        setEmail(s.email || "");
        setUserAvatarId(s.userAvatarId);
        setGoals(s.goals || []);
        setWeeklyGoal(s.weeklyGoal || 3);
        setLanguage(s.language || "system");
        setTheme(s.theme || "system");
        setHaptics(s.haptics !== false);
        setContactsList(contacts);
      });
    }, [])
  );

  const handleThresholdSelect = async (val: number) => {
    setThreshold(val);
    setThresholdOpen(false);
    const s = await loadSettings();
    await saveSettings({ ...s, reachOutThresholdDays: val });
    setContactsList(await loadContacts());
  };

  const toggleGoal = async (key: string) => {
    const next = goals.includes(key) ? goals.filter(g => g !== key) : [...goals, key];
    setGoals(next);
    await updateSettings({ goals: next });
  };

  const reload = async () => {
    setContactsList(await loadContacts());
  };

  // Same sources as Home and Insights, so the numbers always agree.
  const totalContacts = contactsList.length;
  const week = useMemo(() => weekStats(contactsList, weeklyGoal), [contactsList, weeklyGoal]);
  const dueCount = useMemo(() => dueContacts(contactsList, threshold).length, [contactsList, threshold]);
  const status = useMemo(() => connectionStatus(contactsList, threshold), [contactsList, threshold]);
  const health = status.score;
  const healthColor = healthScoreColor(health);

  return (
    <View style={styles.screen}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          {/* Avatar */}
          <Avatar name={userName} avatarId={userAvatarId} size={52} />

          {/* Name + email */}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>{userName || t("Profil")}</Text>
            <Text style={styles.headerEmail} numberOfLines={1}>{email || t("Hesap ayarları")}</Text>
          </View>

          {/* Edit button */}
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate("ProfileSettings")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t("Profili düzenle")}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <StatCard value={totalContacts}  label={t("Toplam kişi")} />
          <StatCard value={week.moments} label={t("Bu haftaki görüşmeler")} />
          <StatCard value={dueCount} label={t("Görüşme zamanı gelen")} />
        </View>

        {/* ── Health bar ── */}
        <View style={styles.healthCard}>
          <View style={styles.healthLeft}>
            <View style={styles.healthLabelRow}>
              <Text style={styles.healthLabel}>{t("Bağlarının durumu")}</Text>
              <TouchableOpacity
                onPress={() => setHealthInfoOpen(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t("Bağlarının durumu nasıl hesaplanır?")}
                >
                <Ionicons name="information-circle-outline" size={18} color={colors.textSub} />
              </TouchableOpacity>
            </View>
            <Text style={styles.healthSub}>
              {health === null
                ? t("Henüz yeterli veri yok: en az {min} kişi için görüşme kaydı gerekiyor ({count} var).", { min: MIN_SCORED_PEOPLE, count: status.scored })
                : t("{label} · {count} kişinin görüşme kayıtlarına göre", { label: t(healthScoreLabel(health)), count: status.scored })}
            </Text>
            {health !== null ? (
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${health}%` as any, backgroundColor: healthColor }]} />
              </View>
            ) : null}
          </View>
          {health !== null ? (
            <View style={styles.healthRight}>
              <Text style={[styles.healthScore, { color: healthColor }]}>{health}</Text>
              <Text style={styles.healthSuffix}>/100</Text>
            </View>
          ) : null}
        </View>

        {/* ── Hesap ── */}
        <SectionLabel title={t("Hesap")} />

        <View style={styles.card}>
          <RowItem
            icon={<BellIcon />}
            title={t("Bildirim Ayarları")}
            sub={t("Hatırlatma ve bildirim tercihleri")}
            onPress={() => navigation.navigate("NotificationSettings")}
          />
          <RowItem
            icon={<ShieldIcon />}
            title={t("Gizlilik ve Güvenlik")}
            sub={t("Veri ve güvenlik kontrolleri")}
            onPress={() => navigation.navigate("PrivacySecurity")}
          />
          <RowItem
            icon={<StarIcon />}
            title={t("Abonelik")}
            sub={t("Beta · tüm özellikler ücretsiz")}
            onPress={() => navigation.navigate("ManageSubscription")}
            last
          />
        </View>

        {/* ── Uygulama ── */}
        <SectionLabel title={t("Uygulama")} />

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
              <Text style={styles.rowTitle}>{t("Varsayılan görüşme sıklığı")}</Text>
              <Text style={styles.rowSub}>{t("{days} gündür görüşmediğin kişileri hatırlat", { days: threshold })}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{t("{days} gün", { days: threshold })}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, styles.rowBorder]}
            onPress={() => setGoalOpen(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t("Haftalık hedef: {count} kişi", { count: weeklyGoal })}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="flame-outline" size={20} color={colors.warning} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{t("Haftalık hedef")}</Text>
              <Text style={styles.rowSub}>{t("Her hafta kaç kişiyle bağ kurmak istersin?")}</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{weeklyGoal}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, styles.rowBorder]}
            onPress={() => setLanguageOpen(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t("Dil: {language}", { language: languageLabel(language) })}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="language-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{t("Dil")}</Text>
              <Text style={styles.rowSub}>{languageLabel(language)}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, styles.rowBorder]}
            onPress={() => setThemeOpen(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t("Görünüm: {theme}", { theme: themeLabel(theme) })}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="contrast-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{t("Görünüm")}</Text>
              <Text style={styles.rowSub}>{themeLabel(theme)}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={[styles.rowItem, styles.rowBorder]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.warmSoft }]}>
              <Ionicons name="pulse-outline" size={20} color={colors.warmStrong} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{t("Titreşim")}</Text>
              <Text style={styles.rowSub}>{t("Önemli anlarda hafif titreşim")}</Text>
            </View>
            <Switch
              value={haptics}
              onValueChange={async (v) => {
                setHaptics(v);
                await updateSettings({ haptics: v });
                if (v) hapticTap();
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
              accessibilityLabel={t("Titreşim")}
            />
          </View>

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
              <Text style={styles.rowTitle}>{t("Kişileri içe aktar")}</Text>
              <Text style={styles.rowSub}>{t("Rehberden kişi aktar")}</Text>
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
              <Text style={styles.rowTitle}>{t("Onboarding'i tekrar göster")}</Text>
              <Text style={styles.rowSub}>{t("Tanıtım ekranlarını yeniden izle")}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowItem, styles.rowBorder]}
            onPress={runExportBackup}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.successSoft }]}>
              <DownloadIcon />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>{t("Yedek al")}</Text>
              <Text style={styles.rowSub}>{t("Tüm verileri .json dosyası olarak kaydet")}</Text>
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
              <Text style={styles.rowTitle}>{t("Yedekten geri yükle")}</Text>
              <Text style={styles.rowSub}>{t("Daha önce aldığın yedeği içe aktar")}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Hedefler ── */}
        <SectionLabel title={t("Hedeflerin")} />

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
                <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>{g.icon} {t(g.short)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* ── Threshold modal ── */}
      <PickerModal
        visible={thresholdOpen}
        title={t("Varsayılan görüşme sıklığı")}
        desc={t("Kişilere varsayılan olarak ne sıklıkla ulaşmak istersin?")}
        onClose={() => setThresholdOpen(false)}
      >
        {THRESHOLD_OPTIONS.map(val => (
          <PickerOption
            key={val}
            label={t("{days} gün", { days: val })}
            active={threshold === val}
            onPress={() => handleThresholdSelect(val)}
          />
        ))}
      </PickerModal>

      <PickerModal
        visible={goalOpen}
        title={t("Haftalık hedef")}
        desc={t("Her hafta kaç kişiyle bağ kurmak istersin?")}
        onClose={() => setGoalOpen(false)}
      >
        {[1, 2, 3, 5, 7].map(val => (
          <PickerOption
            key={val}
            label={t("{count} kişi", { count: val })}
            active={weeklyGoal === val}
            onPress={async () => {
              setWeeklyGoal(val);
              setGoalOpen(false);
              await updateSettings({ weeklyGoal: val });
            }}
          />
        ))}
      </PickerModal>

      <PickerModal
        visible={languageOpen}
        title={t("Dil")}
        desc={t("Uygulama dilini seç")}
        onClose={() => setLanguageOpen(false)}
      >
        {(["system", "tr", "en"] as const).map(code => (
          <PickerOption
            key={code}
            label={languageLabel(code)}
            active={language === code}
            onPress={async () => {
              setLanguageOpen(false);
              await updateSettings({ language: code });
            }}
          />
        ))}
      </PickerModal>

      <PickerModal
        visible={themeOpen}
        title={t("Görünüm")}
        desc={t("Değişiklik uygulamayı yeniden açtığında uygulanır")}
        onClose={() => setThemeOpen(false)}
      >
        {(["system", "light", "dark"] as const).map(code => (
          <PickerOption
            key={code}
            label={themeLabel(code)}
            active={theme === code}
            onPress={async () => {
              setThemeOpen(false);
              setTheme(code);
              await updateSettings({ theme: code });
              const wanted = code === "system" ? null : code;
              if (wanted && wanted !== colorScheme()) showToast(t("Uygulamayı yeniden açtığında uygulanacak"));
            }}
          />
        ))}
      </PickerModal>

      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />
    </View>
  );
}

function themeLabel(code: "system" | "light" | "dark") {
  if (code === "light") return t("Açık");
  if (code === "dark") return t("Koyu");
  return t("Telefonun ayarı");
}

function languageLabel(code: "system" | "tr" | "en") {
  if (code === "tr") return "Türkçe";
  if (code === "en") return "English";
  return t("Telefonun dili");
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
      ios: { shadowColor: colors.shadow, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
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
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
    backgroundColor: TEAL_SOFT,
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
      ios: { shadowColor: colors.shadow, shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
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
      ios: { shadowColor: colors.shadow, shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
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
      ios: { shadowColor: colors.shadow, shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
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
    flex: 1, backgroundColor: colors.overlay,
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalBox: {
    width: "100%", maxWidth: 380,
    backgroundColor: CARD, borderRadius: 18, padding: 22,
    ...Platform.select({
      ios: { shadowColor: colors.shadow, shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
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
