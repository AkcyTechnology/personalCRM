import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import AppHeader from "../components/AppHeader";
import EmptyState from "../components/EmptyState";
import PermissionDeniedModal from "../components/PermissionDeniedModal";
import { showToast } from "../components/Toast";
import { addContacts, loadContacts } from "../data/contacts";
import { ContactsPermissionError, ContactsUnavailableError, listDeviceContactsAsync, type DeviceContact } from "../utils/deviceContacts";
import { todayISO } from "../utils/dates";
import { ensureNotificationPermissionAsync } from "../utils/notifications";
import type { ContactForm } from "./AddContactScreen";
import { isDuplicateContact } from "../utils/duplicateContact";
import { categorical, colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { t } from "../i18n";
import { bucket, track } from "../utils/analytics";
import Ionicons from "@expo/vector-icons/Ionicons";

function initials(name: string) {
  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarColor(name: string) {
  const palette = categorical();
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return palette[h % palette.length];
}

type Props = NativeStackScreenProps<RootStackParamList, "ImportContacts">;

type LoadState = "loading" | "denied" | "ready" | "error";

export default function ImportContactsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [existingContacts, setExistingContacts] = useState<ContactForm[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [permissionModal, setPermissionModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchDeviceContacts = useCallback(async () => {
    setLoadState("loading");
    try {
      const [mapped, savedContacts] = await Promise.all([listDeviceContactsAsync(), loadContacts()]);
      setExistingContacts(savedContacts);
      setDeviceContacts(mapped);
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ContactsPermissionError) {
        setLoadState("denied");
        setPermissionModal(true);
        return;
      }
      setErrorMessage(
        error instanceof ContactsUnavailableError ? error.message : t("Rehber okunamadı. Lütfen tekrar dene.")
      );
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    fetchDeviceContacts();
  }, [fetchDeviceContacts]);

  const duplicateIds = useMemo(() => {
    const ids = new Set<string>();
    for (const dc of deviceContacts) {
      if (isDuplicateContact(dc, existingContacts)) ids.add(dc.id);
    }
    return ids;
  }, [deviceContacts, existingContacts]);

  const selectableContacts = useMemo(
    () => deviceContacts.filter((dc) => !duplicateIds.has(dc.id)),
    [deviceContacts, duplicateIds]
  );

  const allSelectableSelected =
    selectableContacts.length > 0 && selectableContacts.every((dc) => selectedIds.has(dc.id));

  const toggleSelect = (id: string) => {
    if (duplicateIds.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(() => {
      if (allSelectableSelected) return new Set();
      return new Set(selectableContacts.map((dc) => dc.id));
    });
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0 || saving) return;
    setSaving(true);
    try {
      const toAdd = deviceContacts.filter((dc) => selectedIds.has(dc.id));
      track("contacts_imported", { count: bucket(toAdd.length) });
      const today = todayISO();
      await addContacts(
        toAdd.map((dc): ContactForm => ({
          fullName: dc.name,
          company: dc.company,
          jobTitle: dc.jobTitle,
          birthday: /^\d{2}\/\d{2}\/\d{4}$/.test(dc.birthday) ? dc.birthday : "",
          relationship: "",
          metWhere: "",
          phone: dc.phone.replace(/\s+/g, " ").trim(),
          email: dc.email.trim(),
          website: "",
          instagram: "",
          city: "",
          socials: [],
          tags: "",
          priority: "",
          notes: "",
          reminderFreq: "",
          // Son görüşmeyi bilmiyoruz; hatırlatma aralığı bugünden başlar.
          lastContactDate: "",
          reminderIntervalStart: today,
        }))
      );
      ensureNotificationPermissionAsync();
      showToast(
        t("{count} kişi eklendi", { count: toAdd.length })
      );
      navigation.goBack();
    } catch {
      showToast(t("Bir sorun oluştu. Lütfen tekrar dene."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        type="settings"
        centerTitle={t("Rehberden Aktar")}
        onBack={() => navigation.goBack()}
      />

      {loadState === "loading" ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : loadState === "ready" && deviceContacts.length === 0 ? (
        <EmptyState
          icon="person-outline"
          title={t("Rehber boş")}
          description={t("Cihazında kayıtlı kişi bulunamadı.")}
        />
      ) : loadState === "denied" ? (
        <EmptyState
          icon="lock-closed-outline"
          title={t("Rehber izni gerekli")}
          description={t("Kişileri görebilmek için rehber erişimine izin vermelisin.")}
          buttonLabel={t("İzni tekrar iste")}
          onPress={fetchDeviceContacts}
        />
      ) : loadState === "error" ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t("Bir sorun oluştu")}
          description={errorMessage || t("Rehber okunamadı. Lütfen tekrar dene.")}
          buttonLabel={t("Tekrar dene")}
          onPress={fetchDeviceContacts}
        />
      ) : (
        <>
          <View style={styles.toolbar}>
            <Text style={styles.toolbarCount}>
              {selectedIds.size > 0
                ? t("{count} kişi seçildi", { count: selectedIds.size })
                : t("{count} kişi bulundu", { count: deviceContacts.length })}
            </Text>
            {selectableContacts.length > 0 ? (
              <TouchableOpacity onPress={toggleSelectAll} activeOpacity={0.75} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.toolbarAction}>
                  {allSelectableSelected ? t("Tümünü kaldır") : t("Tümünü seç")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={deviceContacts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isDuplicate = duplicateIds.has(item.id);
              const isSelected = selectedIds.has(item.id);
              const color = avatarColor(item.name);
              return (
                <TouchableOpacity
                  style={[styles.row, isDuplicate && styles.rowDisabled]}
                  onPress={() => toggleSelect(item.id)}
                  activeOpacity={isDuplicate ? 1 : 0.7}
                  disabled={isDuplicate}
                  accessibilityRole="checkbox"
                  accessibilityLabel={[item.name, item.phone || item.email, isDuplicate ? t("zaten ekli") : ""].filter(Boolean).join(", ")}
                  accessibilityState={{ checked: isSelected, disabled: isDuplicate }}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: color + "16", borderColor: color + "35" },
                    ]}
                  >
                    <Text style={[styles.avatarText, { color }]}>{initials(item.name)}</Text>
                  </View>

                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {item.phone || item.email || t("Detay yok")}
                    </Text>
                  </View>

                  {isDuplicate ? (
                    <View style={styles.duplicateBadge}>
                      <Text style={styles.duplicateBadgeText}>{t("Zaten ekli")}</Text>
                    </View>
                  ) : (
                    <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                      {isSelected ? <Ionicons name="checkmark" size={16} color={colors.onFill} /> : null}
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 12 }]}>
            <TouchableOpacity
              style={[styles.addBtn, (selectedIds.size === 0 || saving) && styles.addBtnOff]}
              onPress={handleAddSelected}
              activeOpacity={0.85}
              disabled={selectedIds.size === 0 || saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.onFill} />
              ) : (
                <Text style={styles.addBtnText}>
                  {selectedIds.size > 0
                    ? t("Seçilenleri ekle ({count})", { count: selectedIds.size })
                    : t("Kişi seç")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <PermissionDeniedModal
        visible={permissionModal}
        title={t("Rehbere erişim izni gerekli")}
        description={t("Rehberindeki kişileri görebilmek için rehber erişimine izin vermelisin.")}
        onClose={() => setPermissionModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  toolbarCount: { fontSize: 13, fontWeight: "600", color: colors.textSub },
  toolbarAction: { fontSize: 13, fontWeight: "700", color: colors.primary },

  list: { paddingHorizontal: spacing.xl, paddingBottom: 120 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  rowDisabled: { opacity: 0.5 },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "700" },

  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "600", color: colors.text },
  rowSub: { marginTop: 2, fontSize: 12, color: colors.textSub },

  duplicateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  duplicateBadgeText: { fontSize: 11, fontWeight: "600", color: colors.textMuted },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxTick: { color: colors.onFill, fontSize: 14, fontWeight: "800" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  addBtn: {
    height: 50,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnOff: { backgroundColor: colors.primary + "55" },
  addBtnText: { color: colors.onFill, fontSize: 15, fontWeight: "700" },
});
