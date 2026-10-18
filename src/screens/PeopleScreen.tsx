import { useState, useMemo, useCallback } from "react";
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
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { ContactForm } from "./AddContactScreen";
import { loadContacts, deleteContacts, reorderContacts, addContacts, snoozeContact, subscribeContacts, updateContact } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Ionicons from "@expo/vector-icons/Ionicons";
import Avatar from "../components/Avatar";
import LogInteractionModal from "../components/LogInteractionModal";
import SnoozeModal from "../components/SnoozeModal";
import { showUndoToast } from "../components/Toast";
import { daysSinceIntervalStart, effectiveIntervalDays, isDue } from "../utils/reminderInterval";
import { healthScore, healthScoreColor } from "../utils/healthScore";
import { logMoment } from "../app/momentActions";
import type { InteractionType } from "./AddContactScreen";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import EmptyState from "../components/EmptyState";
import { t, tv } from "../i18n";

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAL    = colors.primary;
const GRAY    = colors.textMuted;
const TEXT    = colors.text;
const TEXTSUB = colors.textSub;

type StatusFilter = "all" | "reachOut" | "upcoming" | "recent";

const STATUS_FILTERS: { key: StatusFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all",      label: "Tümü",      icon: "people-outline" },
  { key: "reachOut", label: "Yeniden bağlan", icon: "heart-outline" },
  { key: "upcoming", label: "Yaklaşan",  icon: "hourglass-outline" },
  { key: "recent",   label: "Son görüşülen", icon: "checkmark-done-outline" },
];

const SORT_OPTIONS = [
  { key: "neglect",  label: "En uzun süredir görüşülmeyen" },
  { key: "manual",   label: "Manuel (özel sıra)" },
  { key: "az",       label: "A → Z" },
  { key: "za",       label: "Z → A" },
  { key: "priority", label: "Öncelik" },
  { key: "relation", label: "İlişki türü" },
];

const PRIORITY_ORDER: Record<string, number> = { Yüksek: 0, Orta: 1, Normal: 2, "": 3 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSinceDate(iso?: string): number | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PeopleScreen({ navigation, route }: { navigation: any; route?: any }) {
  const insets = useSafeAreaInsets();
  const initialStatus: StatusFilter = route?.params?.filter ?? "all";
  const isStackScreen = !!route;

  const [contacts, setContacts]     = useState<ContactForm[]>([]);
  const [search, setSearch]         = useState("");
  const [activeFilter, setFilter]   = useState("Tümü");
  const [sortKey, setSortKey]       = useState(initialStatus === "reachOut" ? "neglect" : "az");
  const [status, setStatus]         = useState<StatusFilter>(initialStatus);
  const [threshold, setThreshold]   = useState(14);
  const [loaded, setLoaded]         = useState(false);
  const [logTarget, setLogTarget]   = useState<ContactForm | null>(null);
  const [snoozeTarget, setSnoozeTarget] = useState<ContactForm | null>(null);
  const [sortOpen, setSortOpen]     = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
        setContacts(c);
        setThreshold(s.reachOutThresholdDays || 14);
        setLoaded(true);
      });
      return subscribeContacts(setContacts);
    }, [])
  );

  // İlişki filtreleri: kişilerde gerçekten kullanılan türler (özel türler dahil)
  const relationshipFilters = useMemo(
    () => ["Tümü", ...Array.from(new Set(contacts.map(c => c.relationship).filter(Boolean))).sort((a, b) => a.localeCompare(b, "tr"))],
    [contacts]
  );

  const manualMode = sortKey === "manual";

  const list = useMemo(() => {
    const q = search.toLowerCase();
    const q2 = q.toLocaleLowerCase("tr-TR");
    const result = contacts.filter(c => {
      const hay = [c.fullName, c.company, c.city, c.jobTitle, typeof c.tags === "string" ? c.tags : ""]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      const matchSearch = !q2 || hay.includes(q2);
      const matchFilter = activeFilter === "Tümü" || c.relationship === activeFilter;
      const d = daysSinceIntervalStart(c);
      const interval = effectiveIntervalDays(c, threshold);
      const matchStatus =
        status === "all" ||
        (status === "reachOut" && isDue(c, threshold)) ||
        (status === "upcoming" && c.reminderEnabled !== false && d >= Math.floor(interval * 0.6) && d < interval) ||
        (status === "recent" && !!c.lastContactDate);
      return matchSearch && matchFilter && matchStatus;
    });

    return [...result].sort((a, b) => {
      if (status === "recent")    return (b.lastContactDate || "").localeCompare(a.lastContactDate || "");
      if (sortKey === "neglect")  return daysSinceIntervalStart(b) / effectiveIntervalDays(b, threshold) - daysSinceIntervalStart(a) / effectiveIntervalDays(a, threshold);
      if (sortKey === "manual")   return (a.order ?? 0) - (b.order ?? 0);
      if (sortKey === "az")       return a.fullName.localeCompare(b.fullName, "tr");
      if (sortKey === "za")       return b.fullName.localeCompare(a.fullName, "tr");
      if (sortKey === "priority") return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      if (sortKey === "relation") return a.relationship.localeCompare(b.relationship, "tr");
      return 0;
    });
  }, [contacts, search, activeFilter, sortKey, status, threshold]);

  // Manuel sıralama yalnızca arama/filtre olmadan, ham listede anlamlı.
  const canDrag = manualMode && !search && activeFilter === "Tümü" && status === "all";

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleLongPressCard = (item: ContactForm) => {
    if (!item.id) return;
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([item.id]));
    } else {
      toggleSelected(item.id);
    }
  };

  const handlePressCard = (item: ContactForm) => {
    if (selectMode) {
      if (item.id) toggleSelected(item.id);
      return;
    }
    navigation.navigate("PersonDetail", { contact: item });
  };

  const handleDeleteSelected = async () => {
    setDeleteConfirmOpen(false);
    const ids = Array.from(selectedIds);
    const removed = contacts.filter(c => c.id && selectedIds.has(c.id));
    const updated = await deleteContacts(ids);
    setContacts(updated);
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
    setContacts(prev => {
      const draggedIds = new Set(data.map(c => c.id));
      const rest = prev.filter(c => !draggedIds.has(c.id));
      return [...data, ...rest];
    });
    const orderedIds = data.map(c => c.id).filter((id): id is string => !!id);
    await reorderContacts(orderedIds);
  }, []);

  // Android: statusBar height fallback
  const topInset = insets.top > 0 ? insets.top : (Platform.OS === "android" ? 28 : 20);

  return (
    <View style={styles.root}>

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topInset + 14 }]}>
        {selectMode ? (
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>{t("{count} seçildi", { count: selectedIds.size })}</Text>
              <Text style={styles.headerSub}>{t("Silmek için seç, ya da vazgeç.")}</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelSelectBtn}
              onPress={exitSelectMode}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelSelectBtnText}>{t("Vazgeç")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerTop}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {isStackScreen ? (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("Geri")}
                >
                  <Ionicons name="chevron-back" size={26} color={colors.primary} />
                </TouchableOpacity>
              ) : null}
              <View>
                <Text style={styles.headerTitle} accessibilityRole="header">{t("Kişiler")}</Text>
                <Text style={styles.headerSub}>{t("{count} kişi", { count: contacts.length })}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("AddContact")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={t("Yeni kişi ekle")}
            >
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Search + filter + sort row */}
        {!selectMode && (
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              {/* Search icon — simple inline lines */}
              <Ionicons name="search" size={18} color={GRAY} />
              <TextInput
                style={styles.searchInput}
                placeholder={t("İsim, şirket, şehir, etiket")}
                accessibilityLabel={t("Kişi ara")}
                placeholderTextColor={GRAY}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {!!search && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("Aramayı temizle")}
                >
                  <Ionicons name="close-circle" size={20} color={GRAY} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.toolBtn, activeFilter !== "Tümü" && styles.toolBtnActive]}
              onPress={() => setFilterOpen(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={activeFilter !== "Tümü" ? t("İlişki filtresi: {name}", { name: tv(activeFilter) }) : t("İlişki türüne göre filtrele")}
            >
              <Ionicons name="funnel-outline" size={20} color={activeFilter !== "Tümü" ? TEAL : TEXTSUB} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setSortOpen(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t("Sırala")}
            >
              <Ionicons name="swap-vertical" size={20} color={TEXTSUB} />
            </TouchableOpacity>
          </View>
        )}

        {/* Status chips */}
        {!selectMode && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow} style={styles.statusWrap}>
            {STATUS_FILTERS.map(f => {
              const active = status === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.statusChip, active && styles.statusChipActive]}
                  onPress={() => setStatus(f.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={f.icon} size={15} color={active ? colors.white : colors.textSub} />
                  <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{t(f.label)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Active filter pill */}
        {!selectMode && activeFilter !== "Tümü" && (
          <View style={styles.filterPillRow}>
            <View style={styles.filterPill}>
              <Text style={styles.filterPillText}>{tv(activeFilter)}</Text>
              <TouchableOpacity
                onPress={() => setFilter("Tümü")}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel={t("{name} filtresini kaldır", { name: tv(activeFilter) })}
              >
                <Ionicons name="close" size={14} color={TEAL} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Manual sort hint */}
        {!selectMode && manualMode && (
          <View style={styles.manualHintRow}>
            <Text style={styles.manualHintText}>
              {canDrag
                ? t("Bir kişiyi basılı tutup sürükleyerek sırasını değiştirebilirsin.") : t("Sürükleme için aramayı ve filtreyi temizle.")}
            </Text>
          </View>
        )}
      </View>

      {/* ── List / Empty ── */}
      {!loaded ? (
        <View style={{ padding: 20, gap: 12 }} accessibilityLabel={t("Yükleniyor")} accessibilityRole="progressbar">
          {[0, 1, 2, 3].map(i => <View key={i} style={styles.skeletonRow} />)}
        </View>
      ) : list.length === 0 ? (
        contacts.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title={t("Henüz kişi yok")}
            description={t("İlk bağlantını ekle.")}
            buttonLabel={t("Kişi ekle")}
            onPress={() => navigation.navigate("AddContact")}
            secondaryLabel={t("Rehberden aktar")}
            onSecondaryPress={() => navigation.navigate("ImportContacts")}
          />
        ) : status === "reachOut" && !search && activeFilter === "Tümü" ? (
          <EmptyState icon="checkmark-circle-outline" title={t("Herkesle bağın taze ✨")} description={t("Harika gidiyorsun!")} />
        ) : (
          <EmptyState
            icon="search-outline"
            title={t("Sonuç yok")}
            description={t("Aramayı veya filtreyi değiştir.")}
            buttonLabel={t("Filtreleri temizle")}
            onPress={() => { setSearch(""); setFilter("Tümü"); setStatus("all"); }}
          />
        )
      ) : canDrag ? (
        <DraggableFlatList
          data={list}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onDragEnd={handleDragEnd}
          renderItem={({ item, drag, isActive }: RenderItemParams<ContactForm>) => (
            <PersonCard
              item={item}
              selectMode={selectMode}
              selected={!!item.id && selectedIds.has(item.id)}
              dragActive={isActive}
              onPress={() => handlePressCard(item)}
              onLongPress={drag}
            />
          )}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item, i) => item.id ?? String(i)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const card = (
              <PersonCard
                item={item}
                selectMode={selectMode}
                selected={!!item.id && selectedIds.has(item.id)}
                ring={item.reminderEnabled === false ? undefined : healthScoreColor(healthScore(item, threshold))}
                days={daysSinceDate(item.lastContactDate)}
                due={isDue(item, threshold)}
                onPress={() => handlePressCard(item)}
                onLongPress={() => handleLongPressCard(item)}
              />
            );
            if (selectMode) return card;
            return (
              <ReanimatedSwipeable
                friction={2}
                rightThreshold={40}
                overshootRight={false}
                renderRightActions={(_p, _t, methods) => (
                  <View style={styles.swipeActions}>
                    <TouchableOpacity
                      style={[styles.swipeBtn, { backgroundColor: colors.primary }]}
                      onPress={() => { methods.close(); setLogTarget(item); }}
                      accessibilityRole="button"
                      accessibilityLabel={t("{name} ile görüştüm", { name: item.fullName })}
                    >
                      <Ionicons name="checkmark-circle" size={22} color={colors.white} />
                      <Text style={styles.swipeText}>{t("Görüştüm")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.swipeBtn, { backgroundColor: colors.warning }]}
                      onPress={() => { methods.close(); setSnoozeTarget(item); }}
                      accessibilityRole="button"
                      accessibilityLabel={t("{name} hatırlatmasını ertele", { name: item.fullName })}
                    >
                      <Ionicons name="alarm" size={22} color={colors.white} />
                      <Text style={styles.swipeText}>{t("Ertele")}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              >
                {card}
              </ReanimatedSwipeable>
            );
          }}
        />
      )}

      {/* ── Select-mode bottom bar ── */}
      {selectMode && (
        <View style={[styles.selectBar, { paddingBottom: (insets.bottom || 12) + 10 }]}>
          <TouchableOpacity
            style={[styles.deleteBtn, selectedIds.size === 0 && styles.deleteBtnOff]}
            onPress={() => setDeleteConfirmOpen(true)}
            activeOpacity={0.85}
            disabled={selectedIds.size === 0}
          >
            <Text style={styles.deleteBtnText}>
              {selectedIds.size > 0 ? t("Sil ({count})", { count: selectedIds.size }) : t("Kişi seç")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filter bottom sheet ── */}
      <BottomSheet visible={filterOpen} title={t("Filtrele")} onClose={() => setFilterOpen(false)}>
        <View style={styles.sheetChipGrid}>
          {relationshipFilters.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.sheetChip, activeFilter === f && styles.sheetChipActive]}
              onPress={() => { setFilter(f); setFilterOpen(false); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.sheetChipText, activeFilter === f && styles.sheetChipTextActive]}>
                {tv(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

      {/* ── Sort bottom sheet ── */}
      <BottomSheet visible={sortOpen} title={t("Sırala")} onClose={() => setSortOpen(false)}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sheetRow, sortKey === opt.key && styles.sheetRowActive]}
            onPress={() => { setSortKey(opt.key); setSortOpen(false); }}
            activeOpacity={0.75}
          >
            <Text style={[styles.sheetRowText, sortKey === opt.key && styles.sheetRowTextActive]}>
              {opt.label}
            </Text>
            {sortKey === opt.key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
        ))}
      </BottomSheet>

      <LogInteractionModal
        visible={!!logTarget}
        contactName={logTarget?.fullName ?? ""}
        onClose={() => setLogTarget(null)}
        onSave={handleLog}
      />

      <SnoozeModal
        visible={!!snoozeTarget}
        contactName={snoozeTarget?.fullName ?? ""}
        onCancel={() => setSnoozeTarget(null)}
        onConfirm={handleSnooze}
      />

      {/* ── Delete confirm modal ── */}
      <Modal visible={deleteConfirmOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setDeleteConfirmOpen(false)}>
          <Pressable style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>
              {t("{count} kişi silinsin mi?", { count: selectedIds.size })}
            </Text>
            <Text style={styles.confirmDesc}>
              {t("Notlar ve görüşme geçmişi de silinir. Hemen ardından “Geri al” diyebilirsin.")}
            </Text>
            <TouchableOpacity
              style={styles.confirmDeleteBtn}
              onPress={handleDeleteSelected}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmDeleteBtnText}>{t("Sil")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmCancelBtn}
              onPress={() => setDeleteConfirmOpen(false)}
              activeOpacity={0.75}
            >
              <Text style={styles.confirmCancelBtnText}>{t("Vazgeç")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── PersonCard ────────────────────────────────────────────────────────────────

function PersonCard({
  item, selectMode, selected, dragActive, ring, days, due, onPress, onLongPress,
}: {
  item: ContactForm;
  selectMode: boolean;
  selected: boolean;
  dragActive?: boolean;
  ring?: string;
  days?: number;
  due?: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const tags  = typeof item.tags === "string" ? item.tags : "";
  const subtitle = [item.jobTitle, item.company].filter(Boolean).join(" · ") || tv(item.relationship) || "";
  const daysText = days === undefined || days >= 9999 ? "" : days === 0 ? t("Bugün") : t("{days}g", { days });

  return (
    <TouchableOpacity
      style={[styles.card, dragActive && styles.cardDragging]}
      activeOpacity={0.76}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityLabel={[item.fullName, subtitle, daysText && t("son görüşme {days}", { days: daysText }), due && t("seni özlemiş olabilir")].filter(Boolean).join(", ")}
      accessibilityState={selectMode ? { selected } : undefined}
      accessibilityHint={selectMode ? undefined : t("Seçmek için basılı tut, işlemler için sola kaydır")}
    >
      {/* Selection checkbox */}
      {selectMode && (
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
        </View>
      )}

      {/* Avatar */}
      <Avatar name={item.fullName} size={48} ringColor={ring} />

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.personName} numberOfLines={1}>{item.fullName}</Text>
        <Text style={styles.personSub} numberOfLines={1}>
          {subtitle || "—"}
        </Text>
        {!!tags && (
          <View style={styles.tagRow}>
            {tags.split(",").slice(0, 2).map((t, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{t.trim()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Right */}
      {!selectMode && (
        <View style={styles.cardRight}>
          {!!daysText && (
            <View style={[styles.relBadge, { backgroundColor: (due ? colors.danger : colors.textSub) + "14" }]}>
              <Ionicons name="time-outline" size={12} color={due ? colors.danger : colors.textSub} />
              <Text style={[styles.relText, { color: due ? colors.danger : colors.textSub }]} numberOfLines={1}>{daysText}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── BottomSheet ───────────────────────────────────────────────────────────────

function BottomSheet({
  visible, title, onClose, children,
}: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: (insets.bottom || 12) + 12 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
          <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={styles.sheetCloseTxt}>{t("Kapat")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statusWrap: { marginHorizontal: -20, marginTop: 12 },
  statusRow: { paddingHorizontal: 20, gap: 8 },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, minHeight: 38, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { fontSize: 14, fontWeight: "700", color: colors.textSub },
  statusChipTextActive: { color: colors.white },
  swipeActions: { flexDirection: "row" },
  swipeBtn: { width: 92, alignItems: "center", justifyContent: "center", gap: 4 },
  swipeText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  skeletonRow: { height: 72, borderRadius: 16, backgroundColor: colors.borderLight },
  root: { flex: 1, backgroundColor: colors.white },

  // ── Header ──
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "400",
    color: TEXTSUB,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    ...Platform.select({
      ios: {
        shadowColor: TEAL,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  cancelSelectBtn: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cancelSelectBtnText: { fontSize: 13, fontWeight: "700", color: TEXTSUB },

  // ── Toolbar ──
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    height: 44,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchHandle: {
    position: "absolute",
    width: 5,
    height: 1.8,
    backgroundColor: GRAY,
    borderRadius: 1,
    bottom: 0,
    right: 0,
    transform: [{ rotate: "45deg" }],
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: TEXT,
    paddingVertical: 0,
  },

  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnActive: {
    backgroundColor: TEAL + "15",
    borderColor: TEAL + "60",
  },

  // Active filter pill
  filterPillRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: TEAL + "15",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: TEAL + "40",
  },
  filterPillText: { fontSize: 12, fontWeight: "700", color: TEAL },

  // Manual sort hint
  manualHintRow: {
    paddingBottom: 12,
  },
  manualHintText: {
    fontSize: 12,
    color: TEXTSUB,
    fontStyle: "italic",
  },

  // ── List ──
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    backgroundColor: colors.accentSoft,
    marginLeft: 72,
  },

  // ── Card ──
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 4,
    paddingVertical: 13,
    gap: 13,
  },
  cardDragging: {
    backgroundColor: colors.card,
    borderRadius: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  cardInfo: { flex: 1, minWidth: 0 },
  personName: { fontSize: 16, fontWeight: "700", color: TEXT },
  personSub: { fontSize: 14, color: TEXTSUB, marginTop: 2 },
  tagRow: { flexDirection: "row", gap: 4, marginTop: 6 },
  tag: {
    backgroundColor: TEAL + "14",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: { fontSize: 11, color: TEAL, fontWeight: "600" },
  cardRight: { alignItems: "flex-end", gap: 5, flexShrink: 0 },
  relBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 90,
  },
  relText: { fontSize: 13, fontWeight: "700" },

  // ── Selection checkbox ──
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxOn: { backgroundColor: TEAL, borderColor: TEAL },

  // ── Select-mode bottom bar ──
  selectBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  deleteBtn: {
    height: 50,
    borderRadius: radius.button,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnOff: { backgroundColor: colors.danger + "55" },
  deleteBtnText: { color: colors.white, fontSize: 15, fontWeight: "700" },

  // ── Delete confirm modal ──
  confirmBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.bg,
    borderRadius: radius.modal,
    padding: 24,
    alignItems: "center",
  },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: TEXT, marginBottom: 8, textAlign: "center" },
  confirmDesc: { fontSize: 14, color: TEXTSUB, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  confirmDeleteBtn: {
    width: "100%", height: 50, borderRadius: radius.button,
    backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  confirmDeleteBtnText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  confirmCancelBtn: {
    width: "100%", height: 50, borderRadius: radius.button,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  confirmCancelBtnText: { color: TEXTSUB, fontWeight: "700", fontSize: 15 },

  // ── Bottom sheet ──
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,8,30,0.38)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 16,
  },
  sheetChipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  sheetChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sheetChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  sheetChipText: { fontSize: 13, fontWeight: "600", color: TEXTSUB },
  sheetChipTextActive: { color: colors.white },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sheetRowActive: { backgroundColor: TEAL + "12", borderColor: TEAL + "50" },
  sheetRowText: { fontSize: 14, fontWeight: "600", color: TEXTSUB },
  sheetRowTextActive: { color: TEAL, fontWeight: "800" },
  sheetCloseBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseTxt: { fontSize: 14, fontWeight: "700", color: TEXTSUB },
});
