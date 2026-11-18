import { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import DraggableFlatList, { type RenderItemParams } from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ContactForm, InteractionType } from "./AddContactScreen";
import { loadContacts, deleteContacts, reorderContacts, addContacts, snoozeContact, subscribeContacts, updateContact } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import { DEFAULT_RELATIONSHIPS, loadCustomRelationships } from "../data/relationshipTypes";
import { duplicateIds } from "../utils/duplicateContact";
import Avatar from "../components/Avatar";
import LogInteractionModal from "../components/LogInteractionModal";
import SnoozeModal from "../components/SnoozeModal";
import { showUndoToast } from "../components/Toast";
import { logMoment } from "../app/momentActions";
import { daysSinceLastContact } from "../utils/stats";
import {
  activeFilterCount,
  distinctValues,
  EMPTY_FILTERS,
  filterPeople,
  reminderState,
  tagsOf,
  type AdvancedFilters,
  type LastContactBucket,
  type QuickFilter,
  type ReminderState,
  type SortKey,
} from "../utils/peopleFilters";
import { warm, type as ts, fonts } from "../theme/warm";
import { t, tv } from "../i18n";

// ── Options ───────────────────────────────────────────────────────────────────

const QUICK: { key: QuickFilter; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "due", label: "Zamanı gelen" },
  { key: "week", label: "Sonraki 7 gün" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Ada göre" },
  { key: "lastContact", label: "Son görüşme" },
  { key: "nextReminder", label: "En yakın hatırlatma" },
  { key: "newest", label: "En yeni eklenen" },
  { key: "manual", label: "Özel sıra (sürükle bırak)" },
];

const LAST_CONTACT: { key: LastContactBucket; label: string }[] = [
  { key: "last7", label: "Son 7 gün" },
  { key: "d8to30", label: "8–30 gün önce" },
  { key: "over30", label: "30 günden uzun süre önce" },
  { key: "none", label: "Görüşme kaydı yok" },
];

const REMINDER: { key: ReminderState; label: string }[] = [
  { key: "overdue", label: "Tarihi geçmiş" },
  { key: "today", label: "Bugün" },
  { key: "future", label: "İleri tarihli" },
  { key: "none", label: "Hatırlatma yok" },
];

/** Groups listed first in the filter panel, in this order. */
const FIRST_GROUPS = ["Aile", "Arkadaş", "İş arkadaşı"];

const SIDE = 20;
const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PeopleScreen({ navigation, route }: { navigation: any; route?: any }) {
  const insets = useSafeAreaInsets();
  const isStackScreen = !!route;
  const initialQuick: QuickFilter = route?.params?.filter === "reachOut" ? "due" : "all";

  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [customGroups, setCustomGroups] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<QuickFilter>(initialQuick);
  const [dupOnly, setDupOnly] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>(initialQuick === "due" ? "nextReminder" : "name");
  const [threshold, setThreshold] = useState(14);
  const [loaded, setLoaded] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [logTarget, setLogTarget] = useState<ContactForm | null>(null);
  const [snoozeTarget, setSnoozeTarget] = useState<ContactForm | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadSettings(), loadCustomRelationships()]).then(([c, s, groups]) => {
        setContacts(c);
        setThreshold(s.reachOutThresholdDays || 14);
        setCustomGroups(groups);
        setLoaded(true);
      });
      return subscribeContacts(setContacts);
    }, [])
  );

  const dupIds = useMemo(() => duplicateIds(contacts), [contacts]);
  const showDupes = dupOnly && dupIds.size > 0;
  const list = useMemo(() => {
    if (showDupes) {
      return contacts
        .filter((c) => c.id && dupIds.has(c.id))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
    }
    return filterPeople(contacts, { query, quick, filters, sort: sortKey, threshold });
  }, [contacts, query, quick, filters, sortKey, threshold, showDupes, dupIds]);

  const filterCount = activeFilterCount(filters);
  const canDrag = !showDupes && sortKey === "manual" && !query && quick === "all" && filterCount === 0;

  // ── Selection & actions (unchanged behaviour) ──
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLongPress = (item: ContactForm) => {
    if (!item.id) return;
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([item.id]));
    } else toggleSelected(item.id);
  };

  const handlePress = (item: ContactForm) => {
    if (selectMode) {
      if (item.id) toggleSelected(item.id);
      return;
    }
    navigation.navigate("PersonDetail", { contact: item });
  };

  const handleDeleteSelected = async () => {
    setDeleteConfirmOpen(false);
    const ids = Array.from(selectedIds);
    const removed = contacts.filter((c) => c.id && selectedIds.has(c.id));
    setContacts(await deleteContacts(ids));
    showUndoToast(t("{count} kişi silindi", { count: ids.length }), async () => {
      setContacts(await addContacts(removed));
    });
    exitSelectMode();
  };

  const handleLog = async (type: InteractionType, note: string, date: string) => {
    const target = logTarget;
    setLogTarget(null);
    if (target) await logMoment(target, type, note, date, () => loadContacts().then(setContacts));
  };

  const handleSnooze = async (date: string) => {
    const target = snoozeTarget;
    setSnoozeTarget(null);
    if (!target?.id) return;
    const previous = target.snoozedUntil;
    await snoozeContact(target.id, date);
    setContacts(await loadContacts());
    showUndoToast(t("Hatırlatma ertelendi"), async () => {
      await updateContact(target.id!, { snoozedUntil: previous });
      setContacts(await loadContacts());
    });
  };

  const handleDragEnd = useCallback(async ({ data }: { data: ContactForm[] }) => {
    setContacts((prev) => {
      const ids = new Set(data.map((c) => c.id));
      return [...data, ...prev.filter((c) => !ids.has(c.id))];
    });
    await reorderContacts(data.map((c) => c.id).filter((id): id is string => !!id));
  }, []);

  const clearSearch = () => setQuery("");
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setQuick("all");
  };

  const topInset = insets.top > 0 ? insets.top : Platform.OS === "android" ? 28 : 20;
  const hasPeople = contacts.length > 0;
  const sortLabel = t(SORTS.find((s) => s.key === sortKey)?.label ?? "");

  const renderRow = (item: ContactForm, opts?: { drag?: () => void; active?: boolean }) => (
    <PersonRow
      item={item}
      threshold={threshold}
      selectMode={selectMode}
      selected={!!item.id && selectedIds.has(item.id)}
      dragActive={opts?.active}
      onPress={() => handlePress(item)}
      onLongPress={opts?.drag ?? (() => handleLongPress(item))}
    />
  );

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        {selectMode ? (
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{t("{count} seçildi", { count: selectedIds.size })}</Text>
              <Text style={styles.meta}>{t("Silmek için seç, ya da vazgeç.")}</Text>
            </View>
            <TouchableOpacity style={styles.headerBtn} onPress={exitSelectMode} accessibilityRole="button">
              <Text style={styles.headerBtnText}>{t("Vazgeç")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerRow}>
            {isStackScreen ? (
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t("Geri")}>
                <Ionicons name="chevron-back" size={24} color={warm.text} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.headerText}>
              <Text style={styles.title} accessibilityRole="header">{t("Kişiler")}</Text>
              {hasPeople ? <Text style={styles.meta}>{t("{count} kişi", { count: contacts.length })}</Text> : null}
            </View>
            {hasPeople ? (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => navigation.navigate("AddContact")}
                accessibilityRole="button"
                accessibilityLabel={t("Kişi ekle")}
              >
                <Ionicons name="add" size={18} color={warm.text} />
                <Text style={styles.headerBtnText}>{t("Kişi ekle")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* ── Search, filter, sort ── */}
        {hasPeople && !selectMode ? (
          <>
            <View style={styles.toolbar}>
              <View style={[styles.search, searchFocused && styles.searchFocused]}>
                <Ionicons name="search" size={18} color={warm.textSub} />
                <TextInput
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={styles.searchInput}
                  placeholder={t("Kişi ara")}
                  placeholderTextColor={warm.textSub}
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  accessibilityLabel={t("Kişi ara")}
                  accessibilityHint={t("Ad, şirket, şehir veya etikete göre arar")}
                />
                {query ? (
                  <TouchableOpacity onPress={clearSearch} hitSlop={HIT} accessibilityRole="button" accessibilityLabel={t("Aramayı temizle")}>
                    <Ionicons name="close-circle" size={18} color={warm.textSub} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.toolBtn, filterCount > 0 && styles.toolBtnOn]}
                onPress={() => setFilterOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={filterCount > 0 ? t("Filtreler, {count} etkin", { count: filterCount }) : t("Filtreler")}
              >
                <Ionicons name="funnel-outline" size={20} color={filterCount > 0 ? warm.onSelected : warm.textSub} />
                {filterCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText} allowFontScaling={false}>{filterCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolBtn, sortKey !== "name" && styles.toolBtnOn]}
                onPress={() => setSortOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={t("Sırala: {sort}", { sort: sortLabel })}
              >
                <Ionicons name="swap-vertical" size={20} color={sortKey !== "name" ? warm.onSelected : warm.textSub} />
              </TouchableOpacity>
            </View>

            <View style={styles.quickRow} accessibilityRole="radiogroup">
              {QUICK.map((q) => {
                const on = quick === q.key;
                return (
                  <TouchableOpacity
                    key={q.key}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setQuick(q.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(q.label)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {dupIds.size > 0 ? (
              <View style={styles.dupBanner} accessibilityRole="alert">
                <Ionicons name="copy-outline" size={18} color={warm.warning} />
                <Text style={styles.dupText}>
                  {showDupes
                    ? t("Tekrarlanan kayıtlar gösteriliyor. Fazla olanı açıp silebilirsin.")
                    : t("Aynı isim veya telefonla kayıtlı {count} kişi var", { count: dupIds.size })}
                </Text>
                <TouchableOpacity onPress={() => setDupOnly(!showDupes)} style={styles.dupBtn} accessibilityRole="button">
                  <Text style={styles.dupBtnText}>{showDupes ? t("Tümünü göster") : t("Göster")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {sortKey === "manual" ? (
              <Text style={styles.hint}>
                {canDrag ? t("Bir kişiyi basılı tutup sürükleyerek sırasını değiştirebilirsin.") : t("Sürükleme için aramayı ve filtreleri temizle.")}
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      {/* ── Body ── */}
      {!loaded ? (
        <View style={styles.skeletonWrap} accessibilityLabel={t("Yükleniyor")} accessibilityRole="progressbar">
          {[0, 1, 2, 3].map((i) => <View key={i} style={styles.skeleton} />)}
        </View>
      ) : !hasPeople ? (
        <ScrollView contentContainerStyle={styles.emptyWrap}>
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="person-outline" size={28} color={warm.textSub} />
            </View>
            <Text style={styles.emptyTitle} accessibilityRole="header">{t("Henüz kişi yok")}</Text>
            <Text style={styles.emptyText}>{t("Görüşmelerini ve hatırlatmalarını takip etmek için ilk kişini ekle.")}</Text>
            <TouchableOpacity style={styles.primary} onPress={() => navigation.navigate("AddContact")} accessibilityRole="button">
              <Text style={styles.primaryText}>{t("Kişi ekle")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => navigation.navigate("ImportContacts")} accessibilityRole="button">
              <Text style={styles.secondaryText}>{t("Rehberden seç")}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : list.length === 0 ? (
        <View style={styles.noMatch}>
          <Ionicons name="search-outline" size={24} color={warm.textSub} />
          <Text style={styles.emptyTitle}>{t("Eşleşen kişi bulunamadı")}</Text>
          <View style={styles.noMatchActions}>
            {query ? (
              <TouchableOpacity style={styles.secondaryOutline} onPress={clearSearch} accessibilityRole="button">
                <Text style={styles.secondaryText}>{t("Aramayı temizle")}</Text>
              </TouchableOpacity>
            ) : null}
            {filterCount > 0 || quick !== "all" ? (
              <TouchableOpacity style={styles.secondaryOutline} onPress={clearFilters} accessibilityRole="button">
                <Text style={styles.secondaryText}>{t("Filtreleri temizle")}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : canDrag ? (
        <DraggableFlatList
          data={list}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.listContent}
          onDragEnd={handleDragEnd}
          renderItem={({ item, drag, isActive }: RenderItemParams<ContactForm>) => renderRow(item, { drag, active: isActive })}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            filterCount > 0 || quick !== "all" || query ? (
              <Text style={styles.resultMeta}>{t("{count} kişi gösteriliyor", { count: list.length })}</Text>
            ) : null
          }
          renderItem={({ item, index }) => {
            const row = (
              <View style={[styles.rowWrap, index === list.length - 1 && styles.rowLast]}>
                {renderRow(item)}
              </View>
            );
            if (selectMode) return row;
            return (
              <ReanimatedSwipeable
                friction={2}
                rightThreshold={40}
                overshootRight={false}
                renderRightActions={(_p, _t, methods) => (
                  <View style={styles.swipeActions}>
                    <TouchableOpacity
                      style={[styles.swipeBtn, { backgroundColor: warm.primary }]}
                      onPress={() => { methods.close(); setLogTarget(item); }}
                      accessibilityRole="button"
                      accessibilityLabel={t("{name} ile görüştüm", { name: item.fullName })}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color={warm.onPrimary} />
                      <Text style={[styles.swipeText, { color: warm.onPrimary }]}>{t("Görüştüm")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.swipeBtn, { backgroundColor: warm.warning }]}
                      onPress={() => { methods.close(); setSnoozeTarget(item); }}
                      accessibilityRole="button"
                      accessibilityLabel={t("{name} hatırlatmasını ertele", { name: item.fullName })}
                    >
                      <Ionicons name="alarm-outline" size={20} color={warm.onPrimary} />
                      <Text style={[styles.swipeText, { color: warm.onPrimary }]}>{t("Ertele")}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              >
                {row}
              </ReanimatedSwipeable>
            );
          }}
        />
      )}

      {/* ── Select-mode bar ── */}
      {selectMode ? (
        <View style={[styles.selectBar, { paddingBottom: 12 }]}>
          <TouchableOpacity
            style={[styles.deleteBtn, selectedIds.size === 0 && { opacity: 0.45 }]}
            onPress={() => setDeleteConfirmOpen(true)}
            disabled={selectedIds.size === 0}
            accessibilityRole="button"
          >
            <Text style={styles.deleteBtnText}>{selectedIds.size > 0 ? t("Sil ({count})", { count: selectedIds.size }) : t("Kişi seç")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FilterSheet
        visible={filterOpen}
        contacts={contacts}
        customGroups={customGroups}
        value={filters}
        countFor={(f) => filterPeople(contacts, { query, quick, filters: f, sort: sortKey, threshold }).length}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => { setFilters(f); setFilterOpen(false); }}
      />

      <Sheet visible={sortOpen} title={t("Sırala")} onClose={() => setSortOpen(false)}>
        {SORTS.map((s) => {
          const on = sortKey === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.sortRow, on && styles.sortRowOn]}
              onPress={() => { setSortKey(s.key); setSortOpen(false); }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.sortText, on && styles.sortTextOn]}>{t(s.label)}</Text>
              {on ? <Ionicons name="checkmark" size={20} color={warm.onSelectedSoft} /> : null}
            </TouchableOpacity>
          );
        })}
      </Sheet>

      <LogInteractionModal visible={!!logTarget} contactName={logTarget?.fullName ?? ""} onClose={() => setLogTarget(null)} onSave={handleLog} />
      <SnoozeModal visible={!!snoozeTarget} contactName={snoozeTarget?.fullName ?? ""} onCancel={() => setSnoozeTarget(null)} onConfirm={handleSnooze} />

      <Modal visible={deleteConfirmOpen} transparent animationType="fade" onRequestClose={() => setDeleteConfirmOpen(false)}>
        <Pressable style={styles.overlayCenter} onPress={() => setDeleteConfirmOpen(false)}>
          <Pressable style={styles.confirmBox}>
            <Text style={styles.emptyTitle}>{t("{count} kişi silinsin mi?", { count: selectedIds.size })}</Text>
            <Text style={styles.emptyText}>{t("Notlar ve görüşme geçmişi de silinir. Hemen ardından “Geri al” diyebilirsin.")}</Text>
            <TouchableOpacity style={[styles.primary, { backgroundColor: warm.danger }]} onPress={handleDeleteSelected} accessibilityRole="button">
              <Text style={[styles.primaryText, { color: "#FFFFFF" }]}>{t("Sil")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => setDeleteConfirmOpen(false)} accessibilityRole="button">
              <Text style={styles.secondaryText}>{t("Vazgeç")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function PersonRow({
  item, threshold, selectMode, selected, dragActive, onPress, onLongPress,
}: {
  item: ContactForm;
  threshold: number;
  selectMode: boolean;
  selected: boolean;
  dragActive?: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const subtitle = [item.jobTitle, item.company].filter(Boolean).join(" · ") || tv(item.relationship);
  const days = daysSinceLastContact(item);
  const last = days === null ? t("Görüşme kaydı yok") : days === 0 ? t("Bugün görüştünüz") : t("{days} gün önce", { days });
  const state = reminderState(item, threshold);
  const due = state === "overdue" || state === "today";

  return (
    <TouchableOpacity
      style={[styles.row, dragActive && styles.rowDragging, selected && styles.rowSelected]}
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityLabel={[item.fullName, subtitle, last, due ? t("görüşme zamanı geldi") : ""].filter(Boolean).join(", ")}
      accessibilityState={selectMode ? { selected } : undefined}
      accessibilityHint={selectMode ? undefined : t("Seçmek için basılı tut, işlemler için sola kaydır")}
    >
      {selectMode ? (
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected ? <Ionicons name="checkmark" size={15} color={warm.onSelected} /> : null}
        </View>
      ) : null}
      <Avatar name={item.fullName} avatarId={item.avatarId} size={44} />
      <View style={styles.rowText}>
        <Text style={styles.name} numberOfLines={2}>{item.fullName}</Text>
        {subtitle ? <Text style={styles.meta} numberOfLines={1}>{subtitle}</Text> : null}
        <View style={styles.statusLine}>
          <Text style={styles.meta}>{last}</Text>
          {due && !selectMode ? (
            <View style={styles.duePill}>
              <Ionicons name="time-outline" size={13} color={warm.onSelectedSoft} />
              <Text style={styles.duePillText}>{t("Zamanı geldi")}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Sheets ────────────────────────────────────────────────────────────────────

function Sheet({ visible, title, onClose, children, footer }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} accessibilityRole="header">{title}</Text>
            <TouchableOpacity style={styles.iconBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
              <Ionicons name="close" size={22} color={warm.textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetBody} contentContainerStyle={{ gap: 4, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ChipGroup<K extends string>({ options, selected, onToggle }: { options: { key: K; label: string }[]; selected: K[]; onToggle: (k: K) => void }) {
  return (
    <View style={styles.chipWrap}>
      {options.map((o) => {
        const on = selected.includes(o.key);
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onToggle(o.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            aria-checked={on}
          >
            {on ? <Ionicons name="checkmark" size={14} color={warm.onSelected} /> : null}
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Grup in the filter panel: one collapsible row ("Grup · Tümü ▾") that opens
 * a plain checkbox list in place, instead of a wall of chips.
 */
function GroupSelect({
  options, selected, open, onToggleOpen, onToggle,
}: {
  options: { key: string; label: string }[];
  selected: string[];
  open: boolean;
  onToggleOpen: () => void;
  onToggle: (k: string) => void;
}) {
  const summary =
    selected.length === 0
      ? t("Tümü")
      : selected.length === 1
        ? options.find((o) => o.key === selected[0])?.label ?? tv(selected[0])
        : t("{count} grup seçili", { count: selected.length });
  return (
    <View style={styles.groupBox}>
      <TouchableOpacity
        style={styles.groupRow}
        onPress={onToggleOpen}
        accessibilityRole="button"
        accessibilityLabel={`${t("Grup")}: ${summary}`}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
      >
        <Text style={styles.groupTitle}>{t("Grup")}</Text>
        <Text style={[styles.groupSummary, selected.length > 0 && styles.groupSummaryOn]} numberOfLines={1}>{summary}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={warm.textSub} />
      </TouchableOpacity>
      {open
        ? options.map((o) => {
            const on = selected.includes(o.key);
            return (
              <TouchableOpacity
                key={o.key}
                style={styles.groupOption}
                onPress={() => onToggle(o.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                aria-checked={on}
                accessibilityLabel={o.label}
              >
                <View style={[styles.groupCheck, on && styles.groupCheckOn]}>
                  {on ? <Ionicons name="checkmark" size={15} color={warm.onPrimary} /> : null}
                </View>
                <Text style={styles.groupOptionText}>{o.label}</Text>
              </TouchableOpacity>
            );
          })
        : null}
    </View>
  );
}

function FilterSheet({
  visible, contacts, customGroups, value, countFor, onClose, onApply,
}: {
  visible: boolean;
  contacts: ContactForm[];
  customGroups: string[];
  value: AdvancedFilters;
  countFor: (f: AdvancedFilters) => number;
  onClose: () => void;
  onApply: (f: AdvancedFilters) => void;
}) {
  const [draft, setDraft] = useState<AdvancedFilters>(value);
  const [placeQuery, setPlaceQuery] = useState("");
  // The group list starts collapsed each time the panel opens; collapsing it
  // keeps the choices (they live in `draft`).
  const [groupsOpen, setGroupsOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setPlaceQuery("");
      setGroupsOpen(false);
    }
  }, [visible, value]);

  const groups = useMemo(() => {
    const used = distinctValues(contacts, (c) => c.relationship);
    const all = [...new Set([...FIRST_GROUPS, ...DEFAULT_RELATIONSHIPS, ...customGroups, ...used])];
    return all.map((g) => ({ key: g, label: tv(g) }));
  }, [contacts, customGroups]);
  const tags = useMemo(() => distinctValues(contacts, tagsOf).map((x) => ({ key: x, label: x })), [contacts]);
  const q = placeQuery.trim().toLocaleLowerCase("tr-TR");
  const match = (x: string) => !q || x.toLocaleLowerCase("tr-TR").includes(q);
  const cities = useMemo(() => distinctValues(contacts, (c) => c.city || ""), [contacts]);
  const companies = useMemo(() => distinctValues(contacts, (c) => c.company || ""), [contacts]);
  const shownCities = cities.filter((x) => match(x) || draft.cities.includes(x)).map((x) => ({ key: x, label: x }));
  const shownCompanies = companies.filter((x) => match(x) || draft.companies.includes(x)).map((x) => ({ key: x, label: x }));
  const count = countFor(draft);

  const footer = (
    <View style={styles.sheetFooter}>
      <TouchableOpacity style={styles.footerSecondary} onPress={() => setDraft(EMPTY_FILTERS)} accessibilityRole="button">
        <Text style={styles.secondaryText}>{t("Temizle")}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.primary, styles.footerPrimary]} onPress={() => onApply(draft)} accessibilityRole="button">
        <Text style={styles.primaryText} numberOfLines={1}>{t("{count} kişiyi göster", { count })}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Sheet visible={visible} title={t("Filtreler")} onClose={onClose} footer={footer}>
      <GroupSelect
        options={groups}
        selected={draft.groups}
        open={groupsOpen}
        onToggleOpen={() => setGroupsOpen((o) => !o)}
        onToggle={(k) => setDraft({ ...draft, groups: toggle(draft.groups, k) })}
      />

      <Text style={styles.section}>{t("Son görüşme")}</Text>
      <ChipGroup
        options={LAST_CONTACT.map((o) => ({ ...o, label: t(o.label) }))}
        selected={draft.lastContact}
        onToggle={(k) => setDraft({ ...draft, lastContact: toggle(draft.lastContact, k) })}
      />

      <Text style={styles.section}>{t("Hatırlatma durumu")}</Text>
      <ChipGroup
        options={REMINDER.map((o) => ({ ...o, label: t(o.label) }))}
        selected={draft.reminder}
        onToggle={(k) => setDraft({ ...draft, reminder: toggle(draft.reminder, k) })}
      />

      {tags.length > 0 ? (
        <>
          <Text style={styles.section}>{t("Etiketler")}</Text>
          <ChipGroup options={tags} selected={draft.tags} onToggle={(k) => setDraft({ ...draft, tags: toggle(draft.tags, k) })} />
        </>
      ) : null}

      {cities.length + companies.length > 0 ? (
        <>
          <Text style={styles.section}>{t("Şehir ve şirket")}</Text>
          <View style={[styles.search, styles.sheetSearch]}>
            <Ionicons name="search" size={16} color={warm.textSub} />
            <TextInput
              style={styles.searchInput}
              value={placeQuery}
              onChangeText={setPlaceQuery}
              placeholder={t("Şehir veya şirket ara")}
              placeholderTextColor={warm.textSub}
              accessibilityLabel={t("Şehir veya şirket ara")}
            />
          </View>
          {shownCities.length > 0 ? (
            <>
              <Text style={styles.subSection}>{t("Şehir")}</Text>
              <ChipGroup options={shownCities} selected={draft.cities} onToggle={(k) => setDraft({ ...draft, cities: toggle(draft.cities, k) })} />
            </>
          ) : null}
          {shownCompanies.length > 0 ? (
            <>
              <Text style={styles.subSection}>{t("Şirket")}</Text>
              <ChipGroup options={shownCompanies} selected={draft.companies} onToggle={(k) => setDraft({ ...draft, companies: toggle(draft.companies, k) })} />
            </>
          ) : null}
          {shownCities.length + shownCompanies.length === 0 ? <Text style={styles.meta}>{t("Eşleşen şehir veya şirket yok")}</Text> : null}
        </>
      ) : null}
    </Sheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: warm.bg },

  header: { paddingHorizontal: SIDE, paddingBottom: 12, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerText: { flex: 1, minWidth: 0 },
  title: { ...ts.pageTitle, color: warm.text },
  meta: { ...ts.meta, color: warm.textSub },
  headerBtn: {
    minHeight: 48, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14,
    borderRadius: 24, borderWidth: 1, borderColor: warm.border, backgroundColor: warm.surface,
  },
  headerBtnText: { ...ts.chip, color: warm.text },
  iconBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },

  toolbar: { flexDirection: "row", alignItems: "center", gap: 8 },
  search: {
    flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1, borderColor: warm.border, backgroundColor: warm.surface,
  },
  searchFocused: { borderColor: warm.primary },
  // The focus state is shown on the whole field (above), not the browser's default outline.
  searchInput: { flex: 1, ...ts.body, color: warm.text, paddingVertical: 10, ...(Platform.OS === "web" ? { outlineStyle: "none" as never } : null) },
  toolBtn: {
    width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: warm.border, backgroundColor: warm.surface,
  },
  toolBtnOn: { backgroundColor: warm.selected, borderColor: warm.selected },
  badge: {
    position: "absolute", top: 5, right: 5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: warm.surface, alignItems: "center", justifyContent: "center",
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: warm.primary },

  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -4 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: warm.border, backgroundColor: warm.surface,
  },
  chipOn: { backgroundColor: warm.selected, borderColor: warm.selected },
  chipText: { ...ts.chip, color: warm.textSub },
  chipTextOn: { color: warm.onSelected, fontFamily: fonts.semibold },
  hint: { ...ts.meta, color: warm.textSub, marginTop: -6 },
  dupBanner: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 12, paddingRight: 4, minHeight: 52,
    borderRadius: 12, backgroundColor: warm.surface, borderWidth: 1, borderColor: warm.border,
  },
  dupText: { flex: 1, ...ts.meta, color: warm.text },
  dupBtn: { minHeight: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  dupBtnText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: warm.primary },

  listContent: { paddingHorizontal: SIDE, paddingBottom: 24 },
  resultMeta: { ...ts.meta, color: warm.textSub, marginBottom: 8 },
  // A plain list: no outer frame, just a hairline between people.
  rowWrap: { backgroundColor: warm.bg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: warm.border },
  rowLast: { borderBottomWidth: 0 },
  row: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 2, paddingVertical: 12 },
  rowDragging: { backgroundColor: warm.selectedSoft },
  rowSelected: { backgroundColor: warm.selectedSoft },
  rowText: { flex: 1, minWidth: 0, gap: 1 },
  name: { ...ts.name, color: warm.text },
  statusLine: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4 },
  duePill: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 10, backgroundColor: warm.selectedSoft,
  },
  duePillText: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: warm.onSelectedSoft },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: warm.textSub, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: warm.selected, borderColor: warm.selected },

  swipeActions: { flexDirection: "row" },
  swipeBtn: { width: 84, alignItems: "center", justifyContent: "center", gap: 4 },
  swipeText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },

  emptyWrap: { flexGrow: 1, paddingHorizontal: SIDE, paddingTop: 24, paddingBottom: 24 },
  emptyCard: {
    padding: 24, borderRadius: 20, borderWidth: 1, borderColor: warm.border, backgroundColor: warm.surface,
    alignItems: "center", gap: 8,
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center",
    backgroundColor: warm.bg, borderWidth: 1, borderColor: warm.border, marginBottom: 4,
  },
  emptyTitle: { ...ts.emptyTitle, color: warm.text, textAlign: "center" },
  emptyText: { ...ts.body, color: warm.textSub, textAlign: "center", maxWidth: 300, marginBottom: 8 },
  primary: {
    alignSelf: "stretch", minHeight: 48, borderRadius: 14, backgroundColor: warm.primary,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 16,
  },
  primaryText: { ...ts.button, color: warm.onPrimary },
  secondary: { alignSelf: "stretch", minHeight: 48, alignItems: "center", justifyContent: "center" },
  secondaryOutline: {
    minHeight: 48, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: warm.border,
    backgroundColor: warm.surface, alignItems: "center", justifyContent: "center",
  },
  secondaryText: { ...ts.button, color: warm.text },

  noMatch: { alignItems: "center", gap: 12, paddingHorizontal: SIDE, paddingTop: 48 },
  noMatchActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },

  skeletonWrap: { paddingHorizontal: SIDE, gap: 8 },
  skeleton: { height: 72, borderRadius: 16, backgroundColor: warm.surface, borderWidth: 1, borderColor: warm.border },

  selectBar: { paddingHorizontal: SIDE, paddingTop: 12, borderTopWidth: 1, borderTopColor: warm.border, backgroundColor: warm.bg },
  deleteBtn: { minHeight: 48, borderRadius: 14, backgroundColor: warm.danger, alignItems: "center", justifyContent: "center" },
  deleteBtnText: { ...ts.button, color: "#FFFFFF" },

  overlay: { flex: 1, backgroundColor: warm.overlay, justifyContent: "flex-end" },
  overlayCenter: { flex: 1, backgroundColor: warm.overlay, justifyContent: "center", padding: SIDE },
  confirmBox: { backgroundColor: warm.surface, borderRadius: 20, padding: 20, gap: 8, alignItems: "center" },
  sheet: {
    maxHeight: "88%", backgroundColor: warm.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SIDE, paddingTop: 8, borderTopWidth: 1, borderColor: warm.border,
  },
  sheetHandle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: warm.border, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { ...ts.emptyTitle, color: warm.text },
  sheetBody: { flexGrow: 0 },
  section: { ...ts.chip, color: warm.text, fontFamily: fonts.semibold, marginTop: 16, marginBottom: 8 },
  subSection: { ...ts.meta, color: warm.textSub, marginTop: 10, marginBottom: 6 },
  sheetSearch: { flex: 0, minHeight: 44 },
  groupBox: { marginTop: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: warm.border },
  groupRow: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 },
  groupTitle: { ...ts.chip, color: warm.text, fontFamily: fonts.semibold },
  groupSummary: { flex: 1, ...ts.chip, color: warm.textSub, textAlign: "right" },
  groupSummaryOn: { color: warm.primary },
  groupOption: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 2 },
  groupCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: warm.textSub,
    alignItems: "center", justifyContent: "center",
  },
  groupCheckOn: { backgroundColor: warm.primary, borderColor: warm.primary },
  groupOptionText: { flex: 1, ...ts.body, color: warm.text },
  sheetFooter: { flexDirection: "row", gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: warm.border, marginTop: 8 },
  footerSecondary: {
    minHeight: 48, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, borderColor: warm.border,
    alignItems: "center", justifyContent: "center",
  },
  footerPrimary: { flex: 1, alignSelf: "auto" },
  sortRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderRadius: 12 },
  sortRowOn: { backgroundColor: warm.selectedSoft },
  sortText: { ...ts.body, color: warm.text },
  sortTextOn: { fontFamily: fonts.semibold, color: warm.onSelectedSoft },
});
