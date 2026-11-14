import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  AppState,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { RootStackParamList } from "../navigation/RootNavigator";
import AppHeader from "../components/AppHeader";
import Avatar from "../components/Avatar";
import EmptyState from "../components/EmptyState";
import { showToast } from "../components/Toast";
import { addContacts, loadContacts } from "../data/contacts";
import {
  ContactsPermissionError,
  ContactsUnavailableError,
  listDeviceContactsAsync,
  presentContactAccessPickerAsync,
  type DeviceContact,
} from "../utils/deviceContacts";
import { importSelected, importStatus, type ImportStatus } from "../utils/importPlan";
import { todayISO } from "../utils/dates";
import { askNotificationPermissionWithContext } from "../utils/notifications";
import { infoDialog } from "../utils/confirm";
import type { ContactForm } from "./AddContactScreen";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { t } from "../i18n";
import { bucket, track } from "../utils/analytics";

type Props = NativeStackScreenProps<RootStackParamList, "ImportContacts">;
type LoadState = "loading" | "denied" | "ready" | "error";

const ROW_HEIGHT = 68;

/**
 * Bulk import from the address book. Only the people the user ticks are
 * saved; nothing is sent anywhere. Selection survives searching, scrolling and
 * coming back from the Settings app.
 */
export default function ImportContactsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [limited, setLimited] = useState(false);
  const [existing, setExisting] = useState<ContactForm[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchDeviceContacts = useCallback(async (quiet = false) => {
    if (!quiet) setLoadState("loading");
    try {
      const [{ contacts, limited: isLimited }, saved] = await Promise.all([listDeviceContactsAsync(), loadContacts()]);
      setExisting(saved);
      setDeviceContacts(contacts);
      setLimited(isLimited);
      // Keep earlier ticks that still exist (e.g. after visiting Settings).
      setSelectedIds((prev) => new Set([...prev].filter((id) => contacts.some((c) => c.id === id))));
      setLoadState("ready");
    } catch (error) {
      if (error instanceof ContactsPermissionError) {
        setLoadState("denied");
        return;
      }
      setErrorMessage(error instanceof ContactsUnavailableError ? error.message : t("Rehber okunamadı. Lütfen tekrar dene."));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    fetchDeviceContacts();
    // Coming back from the Settings app after granting access.
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") fetchDeviceContacts(true);
    });
    return () => sub.remove();
  }, [fetchDeviceContacts]);

  const statuses = useMemo(() => {
    const map = new Map<string, ImportStatus>();
    for (const dc of deviceContacts) map.set(dc.id, importStatus(dc, existing));
    return map;
  }, [deviceContacts, existing]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return deviceContacts;
    const digits = q.replace(/\D/g, "");
    return deviceContacts.filter(
      (dc) => dc.name.toLocaleLowerCase("tr-TR").includes(q) || (digits.length >= 3 && dc.phones.some((p) => p.replace(/\D/g, "").includes(digits)))
    );
  }, [deviceContacts, query]);

  const selectableInView = useMemo(() => filtered.filter((dc) => statuses.get(dc.id)?.kind !== "added"), [filtered, statuses]);
  const allInViewSelected = selectableInView.length > 0 && selectableInView.every((dc) => selectedIds.has(dc.id));

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllInView = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allInViewSelected) selectableInView.forEach((dc) => next.delete(dc.id));
      else selectableInView.forEach((dc) => next.add(dc.id));
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0 || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const picked = deviceContacts.filter((dc) => selectedIds.has(dc.id));
      const result = await importSelected(picked, todayISO(), { load: loadContacts, addMany: addContacts });
      track("contacts_imported", { count: bucket(result.added) });
      const saved = await loadContacts();
      setExisting(saved);
      if (result.failed > 0) {
        // Keep only the ones that didn't make it, so "try again" can't duplicate.
        setSelectedIds(new Set(picked.filter((dc) => importStatus(dc, saved).kind !== "added").map((dc) => dc.id)));
        infoDialog(
          t("Bazı kişiler eklenemedi"),
          t("{added} kişi eklendi, {skipped} kişi zaten ekliydi, {failed} kişi eklenemedi. Seçili kalanlar için tekrar deneyebilirsin.", result)
        );
        return;
      }
      showToast(
        result.skipped > 0
          ? t("{added} kişi eklendi · {skipped} kişi zaten ekliydi", result)
          : t("{count} kişi eklendi", { count: result.added })
      );
      if (result.added > 0) askNotificationPermissionWithContext();
      navigation.goBack();
    } catch {
      showToast(t("Bir sorun oluştu. Lütfen tekrar dene."));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: DeviceContact }) => (
      <Row contact={item} status={statuses.get(item.id) ?? { kind: "new" }} selected={selectedIds.has(item.id)} onToggle={toggle} />
    ),
    [statuses, selectedIds, toggle]
  );

  const count = selectedIds.size;

  return (
    <View style={styles.screen}>
      <AppHeader type="settings" centerTitle={t("Rehberden Aktar")} onBack={() => navigation.goBack()} />

      {loadState === "loading" ? (
        <View style={styles.centerFill} accessibilityLabel={t("Yükleniyor")} accessibilityRole="progressbar">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : loadState === "denied" ? (
        <View style={styles.centerFill}>
          <EmptyState
            icon="lock-closed-outline"
            title={t("Rehber izni verilmedi")}
            description={t("Sorun değil: kişileri elle ekleyebilirsin. İstersen Ayarlar'dan rehber erişimine izin verip buraya dönebilirsin.")}
            buttonLabel={t("Kişiyi elle ekle")}
            onPress={() => navigation.replace("AddContact")}
            secondaryLabel={t("Ayarları aç")}
            onSecondaryPress={() => Linking.openSettings()}
          />
        </View>
      ) : loadState === "error" ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t("Bir sorun oluştu")}
          description={errorMessage || t("Rehber okunamadı. Lütfen tekrar dene.")}
          buttonLabel={t("Tekrar dene")}
          onPress={() => fetchDeviceContacts()}
        />
      ) : deviceContacts.length === 0 ? (
        <EmptyState
          icon="person-outline"
          title={limited ? t("Henüz kişi paylaşılmadı") : t("Rehber boş")}
          description={limited ? t("Connectly yalnızca seçtiğin kişileri görebilir.") : t("Cihazında kayıtlı kişi bulunamadı.")}
          buttonLabel={limited ? t("Kişi seç") : t("Kişiyi elle ekle")}
          onPress={limited ? () => presentContactAccessPickerAsync().then(() => fetchDeviceContacts(true)) : () => navigation.replace("AddContact")}
        />
      ) : (
        <>
          {limited ? (
            <View style={styles.limited}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.limitedText}>{t("Connectly yalnızca paylaştığın kişileri görebiliyor.")}</Text>
              <TouchableOpacity onPress={() => presentContactAccessPickerAsync().then(() => fetchDeviceContacts(true))} accessibilityRole="button">
                <Text style={styles.limitedAction}>{t("Daha fazla kişi seç")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder={t("İsim veya numara ara")}
              placeholderTextColor={colors.placeholder}
              accessibilityLabel={t("Rehberde ara")}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel={t("Aramayı temizle")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.toolbar}>
            <Text style={styles.toolbarCount} accessibilityLiveRegion="polite">
              {count > 0 ? t("{count} kişi seçildi", { count }) : t("{count} kişi bulundu", { count: filtered.length })}
            </Text>
            <View style={styles.toolbarActions}>
              {count > 0 ? (
                <TouchableOpacity onPress={() => setSelectedIds(new Set())} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
                  <Text style={styles.toolbarAction}>{t("Seçimi temizle")}</Text>
                </TouchableOpacity>
              ) : null}
              {selectableInView.length > 0 ? (
                <TouchableOpacity onPress={toggleAllInView} accessibilityRole="button" hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
                  <Text style={styles.toolbarAction}>
                    {allInViewSelected
                      ? query ? t("Sonuçların seçimini kaldır") : t("Tümünün seçimini kaldır")
                      : query ? t("Sonuçların hepsini seç ({count})", { count: selectableInView.length }) : t("Tümünü seç ({count})", { count: selectableInView.length })}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            extraData={selectedIds}
            getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
            initialNumToRender={16}
            windowSize={9}
            removeClippedSubviews
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
            ListEmptyComponent={<Text style={styles.noResults}>{t("“{query}” için sonuç yok", { query })}</Text>}
          />

          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
              style={[styles.addBtn, (count === 0 || saving) && styles.addBtnOff]}
              onPress={handleAdd}
              activeOpacity={0.85}
              disabled={count === 0 || saving}
              accessibilityRole="button"
              accessibilityState={{ disabled: count === 0 || saving, busy: saving }}
            >
              {saving ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color={colors.onFill} />
                  <Text style={styles.addBtnText}>{t("Ekleniyor…")}</Text>
                </View>
              ) : (
                <Text style={styles.addBtnText}>{count > 0 ? t("Seçilenleri ekle ({count})", { count }) : t("Eklemek için kişi seç")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const Row = memo(function Row({
  contact,
  status,
  selected,
  onToggle,
}: {
  contact: DeviceContact;
  status: ImportStatus;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const added = status.kind === "added";
  const extra = contact.phones.length > 1 ? t(" · +{count} numara", { count: contact.phones.length - 1 }) : "";
  const hint =
    status.kind === "sharesNumber"
      ? t("Bu numara {name} adıyla da kayıtlı", { name: status.with })
      : status.kind === "sameName"
        ? t("Aynı isimde bir kişi var")
        : "";
  return (
    <TouchableOpacity
      style={[styles.row, added && styles.rowDisabled]}
      onPress={() => onToggle(contact.id)}
      activeOpacity={added ? 1 : 0.7}
      disabled={added}
      accessibilityRole="checkbox"
      accessibilityLabel={[contact.name, contact.phone || contact.email, added ? t("eklendi") : hint].filter(Boolean).join(", ")}
      accessibilityState={{ checked: selected, disabled: added }}
    >
      <Avatar name={contact.name} size={40} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{contact.name}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {hint || `${contact.phone || contact.email || t("Detay yok")}${extra}`}
        </Text>
      </View>
      {added ? (
        <View style={styles.addedBadge}>
          <Ionicons name="checkmark" size={13} color={colors.success} />
          <Text style={styles.addedBadgeText}>{t("Eklendi")}</Text>
        </View>
      ) : (
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected ? <Ionicons name="checkmark" size={16} color={colors.onFill} /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  limited: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6,
    marginHorizontal: spacing.xl, marginTop: spacing.md, padding: 12,
    borderRadius: radius.card, backgroundColor: colors.primarySoft,
  },
  limitedText: { flex: 1, minWidth: 160, fontSize: 13, color: colors.text },
  limitedAction: { fontSize: 13, fontWeight: "700", color: colors.primary },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: spacing.xl, marginTop: spacing.md, paddingHorizontal: 12,
    minHeight: 44, borderRadius: radius.input, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  search: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 8 },
  toolbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  toolbarCount: { fontSize: 13, fontWeight: "700", color: colors.textSub },
  toolbarActions: { flexDirection: "row", gap: 16 },
  toolbarAction: { fontSize: 13, fontWeight: "700", color: colors.primary },
  list: { paddingHorizontal: spacing.xl },
  noResults: { textAlign: "center", color: colors.textSub, marginTop: 32, fontSize: 14 },
  row: {
    height: ROW_HEIGHT, flexDirection: "row", alignItems: "center", gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight,
  },
  rowDisabled: { opacity: 0.6 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: "600", color: colors.text },
  rowSub: { marginTop: 2, fontSize: 13, color: colors.textSub },
  addedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.pill, backgroundColor: colors.successSoft,
  },
  addedBadgeText: { fontSize: 12, fontWeight: "700", color: colors.success },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: colors.textMuted, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  bottomBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  addBtn: { minHeight: 52, borderRadius: radius.button, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  addBtnOff: { opacity: 0.45 },
  busyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  addBtnText: { color: colors.onFill, fontSize: 16, fontWeight: "700" },
});
