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
import { addContact, loadContacts } from "../data/contacts";
import type { ContactForm } from "./AddContactScreen";
import { isDuplicateContact } from "../utils/duplicateContact";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";

type DeviceContact = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

function initials(name: string) {
  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarColor(name: string) {
  const palette = ["#00B5AC", "#7C3AED", "#0369A1", colors.success, colors.warning];
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

  const fetchDeviceContacts = useCallback(async () => {
    setLoadState("loading");
    try {
      const Contacts = require("expo-contacts/legacy");

      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setLoadState("denied");
        setPermissionModal(true);
        return;
      }

      const [{ data }, savedContacts] = await Promise.all([
        Contacts.getContactsAsync({
          fields: [
            Contacts.Fields.Name,
            Contacts.Fields.PhoneNumbers,
            Contacts.Fields.Emails,
          ],
          sort: Contacts.SortTypes.FirstName,
        }),
        loadContacts(),
      ]);

      const mapped: DeviceContact[] = (data || [])
        .filter((c: any) => !!c.name)
        .map((c: any, i: number) => ({
          id: c.id ?? String(i),
          name: c.name,
          phone: c.phoneNumbers?.[0]?.number ?? "",
          email: c.emails?.[0]?.email ?? "",
        }));

      setExistingContacts(savedContacts);
      setDeviceContacts(mapped);
      setLoadState("ready");
    } catch {
      setLoadState("error");
      showToast("Rehber okunamadı. Lütfen tekrar dene.");
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
    setSelectedIds((prev) => {
      if (allSelectableSelected) return new Set();
      return new Set(selectableContacts.map((dc) => dc.id));
    });
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0 || saving) return;
    setSaving(true);
    try {
      const toAdd = deviceContacts.filter((dc) => selectedIds.has(dc.id));
      for (const dc of toAdd) {
        const newContact: ContactForm = {
          fullName: dc.name,
          company: "",
          jobTitle: "",
          birthday: "",
          relationship: "",
          metWhere: "",
          phone: dc.phone.replace(/\s+/g, " ").trim(),
          email: dc.email.trim(),
          website: "",
          instagram: "",
          city: "",
          socials: [{ platform: "LinkedIn", handle: "" }],
          tags: "",
          priority: "",
          notes: "",
          reminderFreq: "",
          lastContactDate: new Date().toISOString().split("T")[0],
        };
        await addContact(newContact);
      }
      showToast(
        toAdd.length === 1 ? "1 kişi eklendi" : `${toAdd.length} kişi eklendi`
      );
      navigation.goBack();
    } catch {
      showToast("Bir sorun oluştu. Lütfen tekrar dene.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        type="settings"
        centerTitle="Rehberden Aktar"
        onBack={() => navigation.goBack()}
      />

      {loadState === "loading" ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : loadState === "ready" && deviceContacts.length === 0 ? (
        <EmptyState
          icon="👤"
          title="Rehber boş"
          description="Cihazında kayıtlı kişi bulunamadı."
        />
      ) : loadState === "denied" ? (
        <EmptyState
          icon="🔒"
          title="Rehber izni gerekli"
          description="Kişileri görebilmek için rehber erişimine izin vermelisin."
          buttonLabel="İzni tekrar iste"
          onPress={fetchDeviceContacts}
        />
      ) : loadState === "error" ? (
        <EmptyState
          icon="⚠️"
          title="Bir sorun oluştu"
          description="Rehber okunamadı. Lütfen tekrar dene."
          buttonLabel="Tekrar dene"
          onPress={fetchDeviceContacts}
        />
      ) : (
        <>
          <View style={styles.toolbar}>
            <Text style={styles.toolbarCount}>
              {selectedIds.size > 0
                ? `${selectedIds.size} kişi seçildi`
                : `${deviceContacts.length} kişi bulundu`}
            </Text>
            {selectableContacts.length > 0 ? (
              <TouchableOpacity onPress={toggleSelectAll} activeOpacity={0.75}>
                <Text style={styles.toolbarAction}>
                  {allSelectableSelected ? "Tümünü kaldır" : "Tümünü seç"}
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
                      {item.phone || item.email || "Detay yok"}
                    </Text>
                  </View>

                  {isDuplicate ? (
                    <View style={styles.duplicateBadge}>
                      <Text style={styles.duplicateBadgeText}>Zaten ekli</Text>
                    </View>
                  ) : (
                    <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                      {isSelected ? <Text style={styles.checkboxTick}>✓</Text> : null}
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
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.addBtnText}>
                  {selectedIds.size > 0
                    ? `Seçilenleri Ekle (${selectedIds.size})`
                    : "Kişi seç"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      <PermissionDeniedModal
        visible={permissionModal}
        title="Rehbere erişim izni gerekli"
        description="Rehberindeki kişileri görebilmek için rehber erişimine izin vermelisin."
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
  checkboxTick: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

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
  addBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
