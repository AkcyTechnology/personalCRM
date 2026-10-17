import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import PermissionDeniedModal from "../components/PermissionDeniedModal";
import { loadSettings, saveSettings } from "../data/userSettings";
import { ensureNotificationPermissionAsync, notificationsUnavailable } from "../utils/notifications";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";

export default function NotificationSettingsScreen({ navigation }: any) {
  const [birthday, setBirthday] = useState(true);
  const [followUp, setFollowUp] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [smartNudge, setSmartNudge] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        setBirthday(s.notif_birthday);
        setFollowUp(s.notif_followUp);
        setWeeklySummary(s.notif_weeklySummary);
        setSmartNudge(s.notif_smartNudge);
        setLoaded(true);
      });
    }, [])
  );

  const save = async (key: string, val: boolean) => {
    const current = await loadSettings();
    await saveSettings({ ...current, [key]: val });
  };

  const ensurePermission = async (): Promise<boolean> => {
    const granted = await ensureNotificationPermissionAsync();
    if (!granted) {
      setPermissionModalOpen(true);
      return false;
    }
    return true;
  };

  const toggleWithPermission = async (
    value: boolean,
    setLocal: (v: boolean) => void,
    key: string
  ) => {
    if (value) {
      const granted = await ensurePermission();
      if (!granted) {
        setLocal(false);
        return;
      }
    }
    setLocal(value);
    save(key, value);
  };

  const handleBirthday = (v: boolean) => toggleWithPermission(v, setBirthday, "notif_birthday");
  const handleFollowUp = (v: boolean) => toggleWithPermission(v, setFollowUp, "notif_followUp");
  const handleWeeklySummary = (v: boolean) => toggleWithPermission(v, setWeeklySummary, "notif_weeklySummary");
  const handleSmartNudge = (v: boolean) => toggleWithPermission(v, setSmartNudge, "notif_smartNudge");

  if (!loaded) return <View style={styles.screen}><AppHeader type="settings" centerTitle="Bildirim Ayarları" onBack={() => navigation.goBack()} /></View>;

  return (
    <View style={styles.screen}>
      <AppHeader type="settings" centerTitle="Bildirim Ayarları" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notificationsUnavailable ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Expo Go (Android) bildirimleri desteklemiyor. Hatırlatıcıların gelmesi için uygulamanın development build veya mağaza sürümünü kullan.
            </Text>
          </View>
        ) : null}
        <Text style={styles.sectionLabel}>HATIRLATICILAR</Text>

        <View style={styles.card}>
          <SwitchRow
            label="Doğum günü hatırlatıcısı"
            desc="Kişilerin doğum günlerinden 1 gün önce bildirim al"
            value={birthday}
            onChange={handleBirthday}
          />
          <SwitchRow
            label="Takip hatırlatıcısı"
            desc="Ulaşma eşiğini aşan kişiler için uyarı"
            value={followUp}
            onChange={handleFollowUp}
            border
          />
          <SwitchRow
            label="Akıllı dokunuş önerisi"
            desc="En uygun zamanda bağlantı önerileri"
            value={smartNudge}
            onChange={handleSmartNudge}
            border
          />
        </View>

        <Text style={styles.sectionLabel}>ÖZET</Text>

        <View style={styles.card}>
          <SwitchRow
            label="Haftalık özet"
            desc="Her pazartesi ilişki sağlığı özetini al"
            value={weeklySummary}
            onChange={handleWeeklySummary}
          />
        </View>

        <Text style={styles.hint}>
          Bildirimler için cihaz izinleri gerekir. Ayarlar › Bildirimler bölümünden yönetebilirsin.
        </Text>
      </ScrollView>

      <PermissionDeniedModal
        visible={permissionModalOpen}
        title="Bildirim izni gerekli"
        description="Hatırlatıcılar için bildirim gönderebilmemiz için bildirim iznine izin vermelisin."
        onClose={() => setPermissionModalOpen(false)}
      />
    </View>
  );
}

function SwitchRow({
  label,
  desc,
  value,
  onChange,
  border,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  border?: boolean;
}) {
  return (
    <View style={[styles.switchRow, border && styles.borderTop]}>
      <View style={styles.switchInfo}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary + "88" }}
        thumbColor={value ? colors.primary : colors.white}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: colors.warningSoft, borderRadius: 12, padding: 14, marginBottom: 16 },
  noticeText: { fontSize: 13, lineHeight: 19, color: colors.text },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: 60 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: spacing.md,
  },
  borderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  switchDesc: { marginTop: 2, fontSize: 12, color: colors.textSub, lineHeight: 17 },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
});
