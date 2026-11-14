import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import PermissionDeniedModal from "../components/PermissionDeniedModal";
import { loadSettings, saveSettings } from "../data/userSettings";
import { ensureNotificationPermissionAsync, notificationsUnavailable } from "../utils/notifications";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { t } from "../i18n";

export default function NotificationSettingsScreen({ navigation }: any) {
  const [birthday, setBirthday] = useState(true);
  const [followUp, setFollowUp] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [smartNudge, setSmartNudge] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);
  const [hour, setHour] = useState(10);
  const [quiet, setQuiet] = useState(true);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(8);
  const [loaded, setLoaded] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        setBirthday(s.notif_birthday);
        setFollowUp(s.notif_followUp);
        setWeeklySummary(s.notif_weeklySummary);
        setSmartNudge(s.notif_smartNudge);
        setDailySummary(s.notif_dailySummary);
        setHour(s.notifyHour);
        setQuiet(s.quietHoursEnabled);
        setQuietStart(s.quietStart);
        setQuietEnd(s.quietEnd);
        setLoaded(true);
      });
    }, [])
  );

  const save = async (key: string, val: boolean | number) => {
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
  const handleDailySummary = (v: boolean) => toggleWithPermission(v, setDailySummary, "notif_dailySummary");
  const wrap = (h: number) => (h + 24) % 24;
  const stepHour = (setter: (v: number) => void, key: string, current: number, delta: number) => {
    const next = wrap(current + delta);
    setter(next);
    save(key, next);
  };

  if (!loaded) return <View style={styles.screen}><AppHeader type="settings" centerTitle={t("Bildirim Ayarları")} onBack={() => navigation.goBack()} /></View>;

  return (
    <View style={styles.screen}>
      <AppHeader type="settings" centerTitle={t("Bildirim Ayarları")} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {notificationsUnavailable ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {t("Expo Go (Android) bildirimleri desteklemiyor. Hatırlatıcıların gelmesi için uygulamanın development build veya mağaza sürümünü kullan.")}
            </Text>
          </View>
        ) : null}
        <Text style={styles.sectionLabel}>{t("HATIRLATICILAR")}</Text>

        <View style={styles.card}>
          <SwitchRow
            label={t("Doğum günü ve özel günler")}
            desc={t("Doğum gününden bir gün önce ve o gün; kaydettiğin özel günlerde de")}
            value={birthday}
            onChange={handleBirthday}
          />
          <SwitchRow
            label={t("Takip hatırlatıcısı")}
            desc={t("Bir süredir konuşmadığın kişiler için nazik bir hatırlatma")}
            value={followUp}
            onChange={handleFollowUp}
            border
          />
          <SwitchRow
            label={t("Akıllı dokunuş önerisi")}
            desc={t("En uygun zamanda bağlantı önerileri")}
            value={smartNudge}
            onChange={handleSmartNudge}
            border
          />
        </View>

        <Text style={styles.sectionLabel}>{t("ZAMANLAMA")}</Text>

        <View style={styles.card}>
          <HourRow
            label={t("Bildirim saati")}
            desc={t("Otomatik hatırlatmalar bu saatte gelir")}
            hour={hour}
            onStep={(d) => stepHour(setHour, "notifyHour", hour, d)}
          />
          <SwitchRow
            label={t("Sessiz saatler")}
            desc={t("Bu aralıkta otomatik bildirim gönderilmez; senin saatini seçtiğin hatırlatıcılar etkilenmez")}
            value={quiet}
            onChange={(v) => { setQuiet(v); save("quietHoursEnabled", v); }}
            border
          />
          {quiet ? (
            <>
              <HourRow label={t("Başlangıç")} hour={quietStart} onStep={(d) => stepHour(setQuietStart, "quietStart", quietStart, d)} border />
              <HourRow label={t("Bitiş")} hour={quietEnd} onStep={(d) => stepHour(setQuietEnd, "quietEnd", quietEnd, d)} border />
            </>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>{t("ÖZET")}</Text>

        <View style={styles.card}>
          <SwitchRow
            label={t("Günlük özet")}
            desc={t("Her gün bildirim saatinde kısa bir hatırlatma")}
            value={dailySummary}
            onChange={handleDailySummary}
          />
          <SwitchRow
            label={t("Haftalık özet")}
            desc={t("Her pazartesi sabahı haftaya kısa bir bakış")}
            value={weeklySummary}
            onChange={handleWeeklySummary}
            border
          />
        </View>

        <Text style={styles.hint}>
          {t("Bildirimler için cihaz izni gerekir. Bildirimlerin tam dakikasında gelmesi telefonun pil ve odak ayarlarına bağlıdır. İzin vermesen de hatırlatmalar uygulama içinde görünür.")}
        </Text>
      </ScrollView>

      <PermissionDeniedModal
        visible={permissionModalOpen}
        title={t("Bildirim izni gerekli")}
        description={t("Hatırlatıcılar için bildirim gönderebilmemiz için bildirim iznine izin vermelisin.")}
        onClose={() => setPermissionModalOpen(false)}
      />
    </View>
  );
}

function HourRow({ label, desc, hour, onStep, border }: { label: string; desc?: string; hour: number; onStep: (delta: number) => void; border?: boolean }) {
  const text = `${String(hour).padStart(2, "0")}:00`;
  return (
    <View style={[styles.switchRow, border && styles.borderTop]} accessible accessibilityRole="adjustable" accessibilityLabel={`${label}, ${text}`}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => onStep(e.nativeEvent.actionName === "increment" ? 1 : -1)}
    >
      <View style={styles.switchInfo}>
        <Text style={styles.switchLabel}>{label}</Text>
        {desc ? <Text style={styles.switchDesc}>{desc}</Text> : null}
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onStep(-1)} accessibilityLabel={t("Bir saat erken")} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="remove" size={18} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.stepValue}>{text}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onStep(1)} accessibilityLabel={t("Bir saat geç")} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="add" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
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
        accessibilityLabel={label}
        accessibilityHint={desc}
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
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  stepValue: { minWidth: 52, textAlign: "center", fontSize: 15, fontWeight: "700", color: colors.text, fontVariant: ["tabular-nums"] },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
});
