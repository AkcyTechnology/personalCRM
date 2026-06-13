import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "PersonDetail">;

const PURPLE = "#7C3AED";
const BG     = "#FAF9FF";
const CARD   = "#FFFFFF";
const BORDER = "#ECE8F7";
const TEXT   = "#191826";
const MUTED  = "#8E8AA3";
const GREEN  = "#22C55E";
const ORANGE = "#F59E0B";
const RED    = "#EF4444";

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function avatarColor(name: string) {
  const p = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#0891B2", "#9333EA"];
  let h = 0; for (const c of name) h += c.charCodeAt(0);
  return p[h % p.length];
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function healthScore(daysSinceContact: number, threshold: number) {
  return Math.max(0, Math.min(100, 100 - Math.round((daysSinceContact / threshold) * 100)));
}

function priorityColor(priority: string) {
  if (priority === "Yüksek") return RED;
  if (priority === "Orta")   return ORANGE;
  return GREEN;
}

export default function PersonDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const contact = route.params.contact;

  const color     = avatarColor(contact.fullName);
  const days      = daysSince(contact.lastContactDate);
  const threshold = 14;
  const score     = healthScore(days, threshold);

  const scoreColor = score >= 70 ? GREEN : score >= 40 ? ORANGE : RED;

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Geri</Text>
        </TouchableOpacity>
        {contact.priority ? (
          <View style={[styles.priorityPill, { backgroundColor: priorityColor(contact.priority) + "18", borderColor: priorityColor(contact.priority) + "40" }]}>
            <Text style={[styles.priorityText, { color: priorityColor(contact.priority) }]}>{contact.priority}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Profile ── */}
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: color + "20", borderColor: color + "40" }]}>
            <Text style={[styles.avatarText, { color }]}>{initials(contact.fullName)}</Text>
          </View>
          <Text style={styles.name}>{contact.fullName}</Text>
          {(contact.jobTitle || contact.company) ? (
            <Text style={styles.subtitle}>
              {[contact.jobTitle, contact.company].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          {contact.relationship ? (
            <View style={styles.relationPill}>
              <Text style={styles.relationText}>{contact.relationship}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Sağlık Skoru ── */}
        <View style={styles.healthBar}>
          <View style={styles.healthLeft}>
            <Text style={styles.healthLabel}>İlişki Sağlığı</Text>
            <Text style={styles.healthSub}>{days} gündür iletişim yok</Text>
          </View>
          <View style={[styles.healthCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.healthScore, { color: scoreColor }]}>{score}</Text>
          </View>
        </View>

        {/* ── Hızlı Eylemler ── */}
        <View style={styles.actions}>
          {contact.phone ? (
            <Action
              icon="📞" label="Ara" color={GREEN}
              onPress={() => Linking.openURL(`tel:${contact.phone}`)}
            />
          ) : null}
          {contact.email ? (
            <Action
              icon="✉️" label="Mail" color={PURPLE}
              onPress={() => Linking.openURL(`mailto:${contact.email}`)}
            />
          ) : null}
          {contact.phone ? (
            <Action
              icon="💬" label="Mesaj" color={ORANGE}
              onPress={() => Linking.openURL(`sms:${contact.phone}`)}
            />
          ) : null}
          <Action icon="🔔" label="Hatırlat" color="#9B7CFF" onPress={() => navigation.navigate("Reminders")} />
        </View>

        {/* ── İletişim Bilgileri ── */}
        <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
        <View style={styles.card}>
          {contact.phone ? <InfoRow icon="📞" text={contact.phone} border /> : null}
          {contact.email ? <InfoRow icon="✉️" text={contact.email} border={!!contact.birthday} /> : null}
          {contact.birthday ? <InfoRow icon="🎂" text={`Doğum günü: ${contact.birthday}`} /> : null}
          {!contact.phone && !contact.email && !contact.birthday ? (
            <Text style={styles.emptyInfo}>Henüz bilgi yok.</Text>
          ) : null}
        </View>

        {/* ── Sosyal Medya ── */}
        {contact.socials && contact.socials.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Sosyal Medya</Text>
            <View style={styles.card}>
              {contact.socials.map((s, i) => (
                <InfoRow
                  key={i}
                  icon="🔗"
                  text={`${s.platform}: ${s.handle}`}
                  border={i < contact.socials.length - 1}
                />
              ))}
            </View>
          </>
        ) : null}

        {/* ── Tanışma / İlişki ── */}
        <Text style={styles.sectionTitle}>Tanışma</Text>
        <View style={styles.card}>
          {contact.relationship ? <InfoRow icon="🤝" text={`İlişki: ${contact.relationship}`} border={!!contact.metWhere} /> : null}
          {contact.metWhere ? <InfoRow icon="📍" text={`Nerede: ${contact.metWhere}`} /> : null}
          {!contact.relationship && !contact.metWhere ? (
            <Text style={styles.emptyInfo}>Bilgi yok.</Text>
          ) : null}
        </View>

        {/* ── Etiketler ── */}
        {contact.tags ? (
          <>
            <Text style={styles.sectionTitle}>Etiketler</Text>
            <View style={styles.tagsRow}>
              {contact.tags.split(",").map(t => t.trim()).filter(Boolean).map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* ── Notlar ── */}
        {contact.notes ? (
          <>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <View style={styles.card}>
              <Text style={styles.notes}>{contact.notes}</Text>
            </View>
          </>
        ) : null}

        {/* ── Son İletişim ── */}
        <Text style={styles.sectionTitle}>Son İletişim</Text>
        <View style={styles.card}>
          <InfoRow
            icon="🗓"
            text={`Son iletişim: ${contact.lastContactDate}`}
          />
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Action({ icon, label, color, onPress }: {
  icon: string; label: string; color: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.actionBox, { backgroundColor: color + "15", borderColor: color + "35" }]}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ icon, text, border }: { icon: string; text: string; border?: boolean }) {
  return (
    <View style={[styles.infoRow, border && styles.rowBorder]}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 22, paddingBottom: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  back: { color: PURPLE, fontSize: 15, fontWeight: "800" },
  priorityPill: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  priorityText: { fontSize: 12, fontWeight: "800" },

  content: { paddingHorizontal: 22, paddingBottom: 60 },

  profile: { alignItems: "center", marginTop: 8 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 2, alignItems: "center", justifyContent: "center",
    shadowColor: PURPLE, shadowOpacity: 0.14, shadowRadius: 16, elevation: 6,
  },
  avatarText: { fontSize: 30, fontWeight: "900" },
  name: { marginTop: 16, fontSize: 24, fontWeight: "900", color: TEXT },
  subtitle: { marginTop: 5, color: MUTED, fontSize: 13 },
  relationPill: {
    marginTop: 12, backgroundColor: "#F1ECFF",
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
  },
  relationText: { color: PURPLE, fontSize: 12, fontWeight: "800" },

  healthBar: {
    marginTop: 22, backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, padding: 16,
    flexDirection: "row", alignItems: "center",
  },
  healthLeft: { flex: 1 },
  healthLabel: { fontSize: 13, fontWeight: "800", color: TEXT },
  healthSub: { marginTop: 3, fontSize: 12, color: MUTED },
  healthCircle: {
    width: 54, height: 54, borderRadius: 27, borderWidth: 3,
    alignItems: "center", justifyContent: "center",
  },
  healthScore: { fontSize: 17, fontWeight: "900" },

  actions: { flexDirection: "row", justifyContent: "space-around", marginTop: 22 },
  actionItem: { alignItems: "center" },
  actionBox: {
    width: 56, height: 56, borderRadius: 16, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { marginTop: 6, fontSize: 11, color: MUTED, fontWeight: "700" },

  sectionTitle: { marginTop: 22, marginBottom: 10, fontSize: 15, fontWeight: "900", color: TEXT },

  card: {
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, paddingVertical: 4,
  },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  infoIcon: { marginRight: 12, fontSize: 16 },
  infoText: { flex: 1, color: "#514D67", fontSize: 13 },
  emptyInfo: { paddingHorizontal: 14, paddingVertical: 12, color: MUTED, fontSize: 13 },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: "#F1ECFF", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  tagText: { color: PURPLE, fontSize: 12, fontWeight: "700" },

  notes: { paddingHorizontal: 14, paddingVertical: 12, color: "#514D67", fontSize: 13, lineHeight: 20 },
});
