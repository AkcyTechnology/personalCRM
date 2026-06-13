import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import type { ContactForm } from "./AddContactScreen";
import { loadContacts } from "../data/contacts";

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  purple:      "#7C3AED",
  purpleLight: "#EDE9FF",
  bg:          "#FAF9FF",
  card:        "#FFFFFF",
  border:      "#ECE8F7",
  text:        "#191826",
  sub:         "#6B6884",
  muted:       "#A09CB8",
  amber:       "#F59E0B",
};

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const FILTERS = ["Tümü", "Arkadaş", "İş arkadaşı", "Mentor", "Müşteri", "Aile", "Tanıdık"];

const SORT_OPTIONS = [
  { key: "az",       label: "A → Z" },
  { key: "za",       label: "Z → A" },
  { key: "priority", label: "Öncelik" },
  { key: "relation", label: "İlişki türü" },
];

const PRIORITY_ORDER: Record<string, number> = { Yüksek: 0, Orta: 1, Normal: 2, "": 3 };

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function avatarColor(name: string) {
  const palette = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626", "#0891B2", "#9333EA"];
  let hash = 0;
  for (const ch of name) hash += ch.charCodeAt(0);
  return palette[hash % palette.length];
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  navigation: any;
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PeopleScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [contacts, setContacts]     = useState<ContactForm[]>([]);
  const [search, setSearch]         = useState("");
  const [activeFilter, setFilter]   = useState("Tümü");
  const [sortKey, setSortKey]       = useState("az");
  const [sortOpen, setSortOpen]     = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Sayfa her odaklandığında AsyncStorage'dan çek
  useFocusEffect(
    useCallback(() => {
      loadContacts().then(setContacts);
    }, [])
  );

  // ── Filtrelenmiş + sıralanmış liste ──────────────────────────────────────────
  const list = useMemo(() => {
    const q = search.toLowerCase();
    let result = contacts.filter(c => {
      const matchSearch =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.tags.toLowerCase().includes(q);

      const matchFilter =
        activeFilter === "Tümü" || c.relationship === activeFilter;

      return matchSearch && matchFilter;
    });

    result = [...result].sort((a, b) => {
      if (sortKey === "az")       return a.fullName.localeCompare(b.fullName, "tr");
      if (sortKey === "za")       return b.fullName.localeCompare(a.fullName, "tr");
      if (sortKey === "priority") return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
      if (sortKey === "relation") return a.relationship.localeCompare(b.relationship, "tr");
      return 0;
    });

    return result;
  }, [contacts, search, activeFilter, sortKey]);

  const sortLabel = SORT_OPTIONS.find(s => s.key === sortKey)?.label ?? "A → Z";

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── App Bar ── */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>People</Text>
        <View style={styles.appBarRight}>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{contacts.length}</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate("AddContact")}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search + Filter + Sort satırı ── */}
      <View style={styles.toolbar}>
        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Ara..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter butonu */}
        <TouchableOpacity
          style={[styles.toolBtn, activeFilter !== "Tümü" && styles.toolBtnActive]}
          onPress={() => setFilterOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.toolBtnIcon, activeFilter !== "Tümü" && styles.toolBtnIconActive]}>≡</Text>
        </TouchableOpacity>

        {/* Sort butonu */}
        <TouchableOpacity
          style={styles.toolBtn}
          onPress={() => setSortOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.toolBtnIcon}>↕</Text>
        </TouchableOpacity>
      </View>

      {/* Aktif filtre göstergesi */}
      {activeFilter !== "Tümü" && (
        <View style={styles.activeFilterRow}>
          <Text style={styles.activeFilterLabel}>Filtre:</Text>
          <View style={styles.activeFilterChip}>
            <Text style={styles.activeFilterText}>{activeFilter}</Text>
            <TouchableOpacity onPress={() => setFilter("Tümü")} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.activeFilterClear}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Liste ── */}
      {list.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>{contacts.length === 0 ? "👥" : "🔍"}</Text>
          <Text style={styles.emptyTitle}>
            {contacts.length === 0 ? "Henüz kişi yok" : "Kişi bulunamadı"}
          </Text>
          <Text style={styles.emptySub}>
            {contacts.length === 0
              ? "＋ butonuna basarak ilk kişini ekle"
              : "Arama veya filtre kriterlerini değiştir"}
          </Text>
          {contacts.length === 0 && (
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate("AddContact")}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyAddBtnText}>Kişi Ekle</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <PersonCard
              item={item}
              onPress={() => navigation.navigate("PersonDetail", { contact: item })}
            />
          )}
        />
      )}

      {/* ── Filter Sheet ── */}
      <BottomSheet
        visible={filterOpen}
        title="Filtrele"
        onClose={() => setFilterOpen(false)}
      >
        <View style={styles.filterGrid}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => { setFilter(f); setFilterOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

      {/* ── Sort Sheet ── */}
      <BottomSheet
        visible={sortOpen}
        title="Sırala"
        onClose={() => setSortOpen(false)}
      >
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.sheetOption, sortKey === opt.key && styles.sheetOptionActive]}
            onPress={() => { setSortKey(opt.key); setSortOpen(false); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.sheetOptionText, sortKey === opt.key && styles.sheetOptionTextActive]}>
              {opt.label}
            </Text>
            {sortKey === opt.key && <Text style={styles.sheetCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </View>
  );
}

// ─── PersonCard ───────────────────────────────────────────────────────────────
function PersonCard({ item, onPress }: { item: ContactForm; onPress?: () => void }) {
  const color = avatarColor(item.fullName);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: color + "18", borderColor: color + "40" }]}>
        <Text style={[styles.avatarText, { color }]}>{initials(item.fullName)}</Text>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.personName} numberOfLines={1}>{item.fullName}</Text>
          {item.priority === "Yüksek" && <Text style={styles.fireEmoji}>🔥</Text>}
          {item.priority === "Orta"   && <Text style={styles.fireEmoji}>⚡</Text>}
        </View>
        <Text style={styles.personSub} numberOfLines={1}>
          {[item.jobTitle, item.company].filter(Boolean).join(" · ") || item.relationship}
        </Text>
        {!!item.tags && (
          <View style={styles.tagRow}>
            {item.tags.split(",").slice(0, 2).map((t, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{t.trim()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.cardRight}>
        <View style={[styles.relBadge, { backgroundColor: color + "15" }]}>
          <Text style={[styles.relBadgeText, { color }]} numberOfLines={1}>{item.relationship}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Reusable BottomSheet ─────────────────────────────────────────────────────
function BottomSheet({
  visible, title, onClose, children,
}: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
          <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.sheetCloseText}>Kapat</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // App Bar
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  appBarTitle: { fontSize: 22, fontWeight: "800", color: C.text },
  appBarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  countPill: {
    backgroundColor: C.purpleLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countPillText: { fontSize: 13, fontWeight: "700", color: C.purple },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.purple,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addBtnText: { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 26 },

  // Toolbar (search + filter + sort)
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchBox: {
    flex: 1,
    height: 42,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 6,
  },
  searchIcon: { fontSize: 17, color: C.muted },
  searchInput: { flex: 1, fontSize: 14, color: C.text },
  searchClear: { fontSize: 11, color: C.muted },
  toolBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  toolBtnActive: {
    backgroundColor: C.purpleLight,
    borderColor: C.purple,
  },
  toolBtnIcon: { fontSize: 18, color: C.sub },
  toolBtnIconActive: { color: C.purple },

  // Active filter row
  activeFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  activeFilterLabel: { fontSize: 12, color: C.muted, fontWeight: "600" },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.purpleLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeFilterText: { fontSize: 12, fontWeight: "700", color: C.purple },
  activeFilterClear: { fontSize: 10, color: C.purple, fontWeight: "700" },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  separator: { height: 1, backgroundColor: C.border, marginLeft: 74 },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderRadius: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 17, fontWeight: "800" },
  cardInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  personName: { fontSize: 15, fontWeight: "700", color: C.text, flexShrink: 1 },
  fireEmoji: { fontSize: 13 },
  personSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  tagRow: { flexDirection: "row", gap: 4, marginTop: 5, flexWrap: "wrap" },
  tag: {
    backgroundColor: C.purpleLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: { fontSize: 10, color: C.purple, fontWeight: "600" },
  cardRight: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  relBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 88,
  },
  relBadgeText: { fontSize: 11, fontWeight: "700" },
  chevron: { fontSize: 22, color: C.muted },

  // Empty
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptySub: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },
  emptyAddBtn: {
    marginTop: 16,
    backgroundColor: C.purple,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyAddBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Bottom Sheet
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,8,30,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: C.text, marginBottom: 14 },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterChipActive: { backgroundColor: C.purple, borderColor: C.purple },
  filterText: { fontSize: 13, fontWeight: "600", color: C.sub },
  filterTextActive: { color: "#fff" },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  sheetOptionActive: { backgroundColor: C.purpleLight, borderColor: C.purple },
  sheetOptionText: { fontSize: 14, fontWeight: "600", color: C.sub },
  sheetOptionTextActive: { color: C.purple, fontWeight: "800" },
  sheetCheck: { fontSize: 16, color: C.purple, fontWeight: "700" },
  sheetCloseBtn: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: { fontSize: 14, fontWeight: "700", color: C.sub },
});
