import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
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
import { loadContacts, deleteContacts, reorderContacts } from "../data/contacts";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { showToast } from "../components/Toast";
import EmptyState from "../components/EmptyState";

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAL    = colors.primary;
const GRAY    = colors.textMuted;
const TEXT    = colors.text;
const TEXTSUB = colors.textSub;

const FILTERS = ["Tümü", "Arkadaş", "İş arkadaşı", "Mentor", "Müşteri", "Aile", "Tanıdık"];

const SORT_OPTIONS = [
  { key: "manual",   label: "Manuel (özel sıra)" },
  { key: "az",       label: "A → Z" },
  { key: "za",       label: "Z → A" },
  { key: "priority", label: "Öncelik" },
  { key: "relation", label: "İlişki türü" },
];

const PRIORITY_ORDER: Record<string, number> = { Yüksek: 0, Orta: 1, Normal: 2, "": 3 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function avatarColor(name: string) {
  const palette = [TEAL, "#2563EB", "#16A34A", "#D97706", "#DC2626", "#0891B2", "#7C3AED"];
  let hash = 0;
  for (const ch of name) hash += ch.charCodeAt(0);
  return palette[hash % palette.length];
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PeopleScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();

  const [contacts, setContacts]     = useState<ContactForm[]>([]);
  const [search, setSearch]         = useState("");
  const [activeFilter, setFilter]   = useState("Tümü");
  const [sortKey, setSortKey]       = useState("az");
  const [sortOpen, setSortOpen]     = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useFocusEffect(
    useCallback(() => { loadContacts().then(setContacts); }, [])
  );

  const manualMode = sortKey === "manual";

  const list = useMemo(() => {
    const q = search.toLowerCase();
    let result = contacts.filter(c => {
      const matchSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        (typeof c.tags === "string" ? c.tags.toLowerCase().includes(q) : false);
      const matchFilter = activeFilter === "Tümü" || c.relationship === activeFilter;
      return matchSearch && matchFilter;
    });

    return [...result].sort((a, b) => {
      if (sortKey === "manual")   return (a.order ?? 0) - (b.order ?? 0);
      if (sortKey === "az")       return a.fullName.localeCompare(b.fullName, "tr");
      if (sortKey === "za")       return b.fullName.localeCompare(a.fullName, "tr");
      if (sortKey === "priority") return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      if (sortKey === "relation") return a.relationship.localeCompare(b.relationship, "tr");
      return 0;
    });
  }, [contacts, search, activeFilter, sortKey]);

  // Manuel sıralama yalnızca arama/filtre olmadan, ham listede anlamlı.
  const canDrag = manualMode && !search && activeFilter === "Tümü";

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
    const updated = await deleteContacts(ids);
    setContacts(updated);
    showToast(ids.length === 1 ? "Kişi silindi" : `${ids.length} kişi silindi`);
    exitSelectMode();
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
              <Text style={styles.headerTitle}>{selectedIds.size} seçildi</Text>
              <Text style={styles.headerSub}>Silmek için seç, ya da vazgeç.</Text>
            </View>
            <TouchableOpacity
              style={styles.cancelSelectBtn}
              onPress={exitSelectMode}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelSelectBtnText}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerTitle}>Kişiler</Text>
              <Text style={styles.headerSub}>{contacts.length} kişi</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate("AddContact")}
              activeOpacity={0.82}
            >
              <Text style={styles.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search + filter + sort row */}
        {!selectMode && (
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              {/* Search icon — simple inline lines */}
              <View style={styles.searchIconWrap}>
                <View style={[styles.searchCircle]} />
                <View style={[styles.searchHandle]} />
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="İsim, şirket veya etiket ara..."
                placeholderTextColor={GRAY}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {!!search && (
                <TouchableOpacity
                  onPress={() => setSearch("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.toolBtn, activeFilter !== "Tümü" && styles.toolBtnActive]}
              onPress={() => setFilterOpen(true)}
              activeOpacity={0.75}
            >
              <FilterIcon active={activeFilter !== "Tümü"} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setSortOpen(true)}
              activeOpacity={0.75}
            >
              <SortIcon />
            </TouchableOpacity>
          </View>
        )}

        {/* Active filter pill */}
        {!selectMode && activeFilter !== "Tümü" && (
          <View style={styles.filterPillRow}>
            <View style={styles.filterPill}>
              <Text style={styles.filterPillText}>{activeFilter}</Text>
              <TouchableOpacity
                onPress={() => setFilter("Tümü")}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.filterPillClear}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Manual sort hint */}
        {!selectMode && manualMode && (
          <View style={styles.manualHintRow}>
            <Text style={styles.manualHintText}>
              {canDrag
                ? "Bir kişiyi basılı tutup sürükleyerek sırasını değiştirebilirsin."
                : "Sürükleme için aramayı ve filtreyi temizle."}
            </Text>
          </View>
        )}
      </View>

      {/* ── List / Empty ── */}
      {list.length === 0 ? (
        contacts.length === 0 ? (
          <EmptyState
            icon="👥"
            title="Henüz kişi eklemedin"
            description="İlk bağlantını ekleyerek ilişkilerini takip etmeye başlayabilirsin."
            buttonLabel="Kişi ekle"
            onPress={() => navigation.navigate("AddContact")}
          />
        ) : (
          <EmptyState
            icon="🔍"
            title="Kişi bulunamadı"
            description="Arama veya filtre kriterlerini değiştir."
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
          renderItem={({ item }) => (
            <PersonCard
              item={item}
              selectMode={selectMode}
              selected={!!item.id && selectedIds.has(item.id)}
              onPress={() => handlePressCard(item)}
              onLongPress={() => handleLongPressCard(item)}
            />
          )}
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
              {selectedIds.size > 0 ? `Sil (${selectedIds.size})` : "Kişi seç"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filter bottom sheet ── */}
      <BottomSheet visible={filterOpen} title="Filtrele" onClose={() => setFilterOpen(false)}>
        <View style={styles.sheetChipGrid}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.sheetChip, activeFilter === f && styles.sheetChipActive]}
              onPress={() => { setFilter(f); setFilterOpen(false); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.sheetChipText, activeFilter === f && styles.sheetChipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

      {/* ── Sort bottom sheet ── */}
      <BottomSheet visible={sortOpen} title="Sırala" onClose={() => setSortOpen(false)}>
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
            {sortKey === opt.key && <Text style={styles.sheetCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </BottomSheet>

      {/* ── Delete confirm modal ── */}
      <Modal visible={deleteConfirmOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setDeleteConfirmOpen(false)}>
          <Pressable style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>
              {selectedIds.size === 1 ? "Kişi silinsin mi?" : `${selectedIds.size} kişi silinsin mi?`}
            </Text>
            <Text style={styles.confirmDesc}>
              Bu işlem geri alınamaz.
            </Text>
            <TouchableOpacity
              style={styles.confirmDeleteBtn}
              onPress={handleDeleteSelected}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmDeleteBtnText}>Sil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmCancelBtn}
              onPress={() => setDeleteConfirmOpen(false)}
              activeOpacity={0.75}
            >
              <Text style={styles.confirmCancelBtnText}>Vazgeç</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── PersonCard ────────────────────────────────────────────────────────────────

function PersonCard({
  item, selectMode, selected, dragActive, onPress, onLongPress,
}: {
  item: ContactForm;
  selectMode: boolean;
  selected: boolean;
  dragActive?: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const color = avatarColor(item.fullName);
  const tags  = typeof item.tags === "string" ? item.tags : "";

  return (
    <TouchableOpacity
      style={[styles.card, dragActive && styles.cardDragging]}
      activeOpacity={0.76}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
    >
      {/* Selection checkbox */}
      {selectMode && (
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected ? <Text style={styles.checkboxTick}>✓</Text> : null}
        </View>
      )}

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: color + "18", borderColor: color + "35" }]}>
        <Text style={[styles.avatarText, { color }]}>{initials(item.fullName)}</Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.personName} numberOfLines={1}>{item.fullName}</Text>
        <Text style={styles.personSub} numberOfLines={1}>
          {[item.jobTitle, item.company].filter(Boolean).join(" · ") || item.relationship || "—"}
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
          {!!item.relationship && (
            <View style={[styles.relBadge, { backgroundColor: color + "14" }]}>
              <Text style={[styles.relText, { color }]} numberOfLines={1}>{item.relationship}</Text>
            </View>
          )}
          <Text style={styles.chevron}>›</Text>
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
            <Text style={styles.sheetCloseTxt}>Kapat</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Inline icons (no SVG) ─────────────────────────────────────────────────────

function FilterIcon({ active }: { active: boolean }) {
  const color = active ? TEAL : TEXTSUB;
  return (
    <View style={{ gap: 3.5, alignItems: "center" }}>
      <View style={{ width: 14, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 10, height: 1.8, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 6,  height: 1.8, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function SortIcon() {
  return (
    <View style={{ gap: 3, alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        <View style={{ width: 10, height: 1.8, backgroundColor: TEXTSUB, borderRadius: 1 }} />
        <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 5, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: TEXTSUB }} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        <View style={{ width: 10, height: 1.8, backgroundColor: TEXTSUB, borderRadius: 1 }} />
        <View style={{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderBottomWidth: 5, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: TEXTSUB }} />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },

  // ── Header ──
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EFF8",
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
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "300",
    lineHeight: 27,
    marginTop: -1,
  },
  cancelSelectBtn: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#F8F8FC",
    borderWidth: 1,
    borderColor: "#EEECF8",
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
    backgroundColor: "#F8F8FC",
    borderWidth: 1,
    borderColor: "#EEECF8",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIconWrap: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchCircle: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 1.6,
    borderColor: GRAY,
    top: 0,
    left: 0,
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
    fontSize: 14,
    color: TEXT,
    paddingVertical: 0,
  },
  searchClear: { fontSize: 11, color: GRAY },

  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F8F8FC",
    borderWidth: 1,
    borderColor: "#EEECF8",
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
  filterPillClear: { fontSize: 11, color: TEAL, fontWeight: "700" },

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
    backgroundColor: "#F3F0FF",
    marginLeft: 72,
  },

  // ── Card ──
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
    paddingVertical: 13,
    gap: 13,
  },
  cardDragging: {
    backgroundColor: "#F8F8FC",
    borderRadius: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 16, fontWeight: "800" },
  cardInfo: { flex: 1, minWidth: 0 },
  personName: { fontSize: 15, fontWeight: "700", color: TEXT },
  personSub: { fontSize: 12, color: GRAY, marginTop: 2 },
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 90,
  },
  relText: { fontSize: 11, fontWeight: "700" },
  chevron: { fontSize: 22, color: GRAY, lineHeight: 24 },

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
  checkboxTick: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

  // ── Select-mode bottom bar ──
  selectBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#EEECF8",
  },
  deleteBtn: {
    height: 50,
    borderRadius: radius.button,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnOff: { backgroundColor: colors.danger + "55" },
  deleteBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

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
  confirmDeleteBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
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
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
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
    backgroundColor: "#F8F8FC",
    borderWidth: 1,
    borderColor: "#EEECF8",
  },
  sheetChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  sheetChipText: { fontSize: 13, fontWeight: "600", color: TEXTSUB },
  sheetChipTextActive: { color: "#fff" },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F8F8FC",
    borderWidth: 1,
    borderColor: "#EEECF8",
  },
  sheetRowActive: { backgroundColor: TEAL + "12", borderColor: TEAL + "50" },
  sheetRowText: { fontSize: 14, fontWeight: "600", color: TEXTSUB },
  sheetRowTextActive: { color: TEAL, fontWeight: "800" },
  sheetCheck: { fontSize: 15, color: TEAL, fontWeight: "700" },
  sheetCloseBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F8F8FC",
    borderWidth: 1,
    borderColor: "#EEECF8",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseTxt: { fontSize: 14, fontWeight: "700", color: TEXTSUB },
});
