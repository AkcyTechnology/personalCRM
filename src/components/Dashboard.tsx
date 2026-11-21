import { useMemo, useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { ContactForm } from "../screens/AddContactScreen";
import Avatar from "./Avatar";
import BadgeMedal, { type MedalId } from "./BadgeMedal";
import { AddSheet } from "./ContactReminders";
import { showToast } from "./Toast";
import { INTERACTION_TYPES } from "./LogInteractionModal";
import { addReminder } from "../data/contacts";
import { askNotificationPermissionWithContext } from "../utils/notifications";
import { agoLabel, firstNameOf, type Badge, type RecentMoment, type WeekDay } from "../utils/homeData";
import { parseISODate } from "../utils/dates";
import { colors } from "../theme/colors";
import { locale, t } from "../i18n";

type IconName = keyof typeof Ionicons.glyphMap;

// ── Section header ───────────────────────────────────────────────────────────

/** Compact title with an optional link or action on the right. */
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle} accessibilityRole="header">{title}</Text>
      {right}
    </View>
  );
}

export function LinkButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <TouchableOpacity style={s.link} onPress={onPress} accessibilityRole="button" hitSlop={{ top: 6, bottom: 6 }}>
      {icon ? <Ionicons name={icon} size={16} color={colors.primary} /> : null}
      <Text style={s.linkText}>{label}</Text>
      {icon ? null : <Ionicons name="chevron-forward" size={14} color={colors.primary} />}
    </TouchableOpacity>
  );
}

export function PillButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: IconName }) {
  return (
    <TouchableOpacity style={s.pillBtn} onPress={onPress} accessibilityRole="button">
      {icon ? <Ionicons name={icon} size={16} color={colors.primary} /> : null}
      <Text style={s.pillBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Week strip ───────────────────────────────────────────────────────────────

/**
 * Monday–Sunday with today highlighted and a dot on days that have something.
 * Tapping a day selects it; tapping it again clears the selection.
 */
export function WeekStrip({
  days, marked, selected, onSelect,
}: {
  days: WeekDay[];
  marked: Set<string>;
  selected: string | null;
  onSelect: (iso: string | null) => void;
}) {
  return (
    <View style={s.week} accessibilityRole="tablist">
      {days.map((d) => {
        const on = selected === d.iso;
        const has = marked.has(d.iso);
        const wd = d.date.toLocaleDateString(locale(), { weekday: "short" }).replace(".", "");
        const label = `${d.date.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" })}${has ? `, ${t("plan var")}` : ""}`;
        return (
          <TouchableOpacity
            key={d.iso}
            style={[s.day, d.isToday && s.dayToday, on && s.dayOn]}
            onPress={() => onSelect(on ? null : d.iso)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={label}
          >
            <Text style={[s.dayName, d.isPast && s.dayPast, on && s.dayTextOn]} numberOfLines={1}>{wd}</Text>
            <Text style={[s.dayNum, d.isPast && s.dayPast, on && s.dayTextOn]}>{d.date.getDate()}</Text>
            <View style={[s.dot, has ? (on ? s.dotOn : s.dotHas) : null]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Moment timeline ──────────────────────────────────────────────────────────

function typeLabel(m: RecentMoment): string {
  const label = INTERACTION_TYPES.find((x) => x.type === m.interaction?.type)?.label;
  return label ? t(label) : t("Görüşme");
}

/** Recent catch-ups on a thin rail: avatar, name, "5 ay önce · Arama". */
export function MomentTimeline({
  items, onOpen, variant = "people",
}: {
  items: RecentMoment[];
  onOpen: (c: ContactForm) => void;
  /** "people": name first (Home). "history": "X ile görüştün" with the date (Profile). */
  variant?: "people" | "history";
}) {
  return (
    <View style={s.card}>
      {items.map((m, i) => {
        const last = i === items.length - 1;
        const note = m.interaction?.note?.trim();
        const meta = [agoLabel(m.date), typeLabel(m)].join(" · ");
        const date = parseISODate(m.date)?.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" }) ?? m.date;
        return (
          <TouchableOpacity
            key={`${m.contact.id}-${m.date}-${i}`}
            style={s.tlRow}
            onPress={() => onOpen(m.contact)}
            accessibilityRole="button"
            accessibilityLabel={`${m.contact.fullName}, ${meta}${note ? `, ${note}` : ""}`}
          >
            <View style={s.rail}>
              <View style={[s.railDot, i === 0 && s.railDotFirst]} />
              {!last ? <View style={s.railLine} /> : null}
            </View>
            {variant === "people" ? (
              <>
                <Avatar name={m.contact.fullName} avatarId={m.contact.avatarId} size={36} />
                <View style={s.tlText}>
                  <Text style={s.tlName} numberOfLines={1}>{m.contact.fullName}</Text>
                  <Text style={s.tlMeta} numberOfLines={1}>{note ? `${meta} · ${note}` : meta}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </>
            ) : (
              <View style={s.tlText}>
                <Text style={s.tlMeta}>{date}</Text>
                <Text style={s.tlName} numberOfLines={2}>
                  {t("{name} ile görüştün", { name: firstNameOf(m.contact.fullName) })}
                  <Text style={s.tlMeta}>{` · ${typeLabel(m)}`}</Text>
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Detail sheet ─────────────────────────────────────────────────────────────

/** Secondary details open here instead of crowding the screen. */
export function InfoSheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
        <Pressable style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} onPress={() => {}}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle} accessibilityRole="header">{title}</Text>
            <TouchableOpacity style={s.close} onPress={onClose} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
              <Ionicons name="close" size={22} color={colors.textSub} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>{children}</ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Plan sheet ───────────────────────────────────────────────────────────────

/**
 * "Plan ekle": pick a person, then the existing dated-reminder form. A plan is
 * a reminder, never a logged catch-up.
 */
export function PlanSheet({
  visible, contacts, day, onClose, onSaved,
}: {
  visible: boolean;
  contacts: ContactForm[];
  day: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState<ContactForm | null>(null);
  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return contacts
      .filter((c) => c.id && (!q || c.fullName.toLocaleLowerCase("tr-TR").includes(q)))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "tr"));
  }, [contacts, query]);
  const close = () => { setQuery(""); setPerson(null); onClose(); };

  return (
    <>
      <Modal visible={visible && !person} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={s.overlay} onPress={close} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
          <Pressable style={[s.sheet, s.sheetTall, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]} onPress={() => {}}>
            <View style={s.handle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle} accessibilityRole="header">{t("Kiminle görüşmeyi planlıyorsun?")}</Text>
              <TouchableOpacity style={s.close} onPress={close} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
                <Ionicons name="close" size={22} color={colors.textSub} />
              </TouchableOpacity>
            </View>
            <View style={s.search}>
              <Ionicons name="search" size={16} color={colors.textSub} />
              <TextInput
                style={s.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={t("Kişi ara")}
                placeholderTextColor={colors.placeholder}
                accessibilityLabel={t("Kişi ara")}
              />
            </View>
            <FlatList
              data={list}
              keyExtractor={(c) => c.id!}
              style={{ flexGrow: 0 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={s.muted}>{t("Eşleşen kişi bulunamadı")}</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.personRow} onPress={() => setPerson(item)} accessibilityRole="button">
                  <Avatar name={item.fullName} avatarId={item.avatarId} size={36} />
                  <Text style={s.personName} numberOfLines={1}>{item.fullName}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
      <AddSheet
        kind={visible && person ? "reminder" : null}
        name={person?.fullName ?? ""}
        initialDate={day ?? undefined}
        onClose={close}
        onSaveReminder={async (date, time, note) => {
          const target = person;
          close();
          if (!target?.id) return;
          await addReminder(target.id, { date, time, note });
          showToast(t("Hatırlatıcı eklendi"));
          askNotificationPermissionWithContext();
          onSaved();
        }}
        onSaveDay={() => {}}
      />
    </>
  );
}

// ── Badges ───────────────────────────────────────────────────────────────────

export function BadgeRow({ items, onOpen }: { items: Badge[]; onOpen: (b: Badge) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgeRow} style={s.bleed}>
      {items.map((b) => (
        <TouchableOpacity
          key={b.id}
          style={s.badge}
          onPress={() => onOpen(b)}
          accessibilityRole="button"
          accessibilityLabel={`${t(b.title)}, ${t(b.goal)}, ${b.earned ? t("kazanıldı") : t("henüz kazanılmadı")}`}
        >
          <BadgeMedal id={b.id as MedalId} earned={b.earned} size={76} />
          <Text style={[s.badgeTitle, !b.earned && s.badgeTextOff]} numberOfLines={1}>{t(b.title)}</Text>
          <Text style={s.badgeGoal} numberOfLines={1}>{t(b.goal)}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Avatar stack ─────────────────────────────────────────────────────────────

export function AvatarStack({ people, size = 32, max = 3 }: { people: ContactForm[]; size?: number; max?: number }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {people.slice(0, max).map((c, i) => (
        <View key={c.id ?? i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3, borderRadius: size / 2, borderWidth: 2, borderColor: colors.surface }}>
          <Avatar name={c.fullName} avatarId={c.avatarId} size={size} />
        </View>
      ))}
    </View>
  );
}

export const dash = {
  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border } as const,
  tint: { backgroundColor: colors.primarySoft, borderRadius: 14 } as const,
};

const s = StyleSheet.create({
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, minHeight: 32 },
  sectionTitle: { fontSize: 17, lineHeight: 22, fontWeight: "700", color: colors.text, flexShrink: 1 },
  link: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 32 },
  linkText: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: colors.primary },
  pillBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18,
    backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder,
  },
  pillBtnText: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: colors.primary },

  week: { flexDirection: "row", gap: 4 },
  day: {
    flex: 1, minHeight: 64, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 2,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  dayToday: { borderColor: colors.primary },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayName: { fontSize: 11, lineHeight: 14, color: colors.textSub, fontWeight: "500" },
  dayNum: { fontSize: 16, lineHeight: 20, color: colors.text, fontWeight: "700" },
  dayPast: { color: colors.textMuted },
  dayTextOn: { color: colors.onFill },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dotHas: { backgroundColor: colors.primary },
  dotOn: { backgroundColor: colors.onFill },

  card: { backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 4 },
  tlRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 10 },
  rail: { width: 12, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  railDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.surface },
  railDotFirst: { backgroundColor: colors.primary },
  railLine: { position: "absolute", top: "62%", bottom: -12, width: 1.5, backgroundColor: colors.primaryBorder },
  tlText: { flex: 1, minWidth: 0, paddingVertical: 8 },
  tlName: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: colors.text },
  tlMeta: { fontSize: 12, lineHeight: 16, fontWeight: "400", color: colors.textSub },

  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "85%", backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 8,
  },
  sheetTall: { height: "75%" },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sheetTitle: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: "600", color: colors.text },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginRight: -12 },
  search: {
    minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, marginBottom: 8,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 8 },
  personRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12 },
  personName: { flex: 1, fontSize: 15, lineHeight: 20, color: colors.text },
  muted: { fontSize: 14, lineHeight: 20, color: colors.textSub, paddingVertical: 12 },

  bleed: { marginHorizontal: -20 },
  badgeRow: { paddingHorizontal: 20, gap: 10 },
  badge: { width: 92, paddingVertical: 4, alignItems: "center", gap: 2 },
  badgeTitle: { fontSize: 14, lineHeight: 18, fontWeight: "700", color: colors.text },
  badgeTextOff: { color: colors.textSub },
  badgeGoal: { fontSize: 12, lineHeight: 16, color: colors.textSub },
});
