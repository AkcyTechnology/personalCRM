import { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import AppHeader from "../components/AppHeader";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { loadContacts, saveContacts } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import type { ContactForm } from "./AddContactScreen";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { effectiveIntervalDays, intervalLabel, INTERVAL_PRESETS } from "../utils/reminderInterval";
import { healthScore as centralHealthScore, healthScoreColor } from "../utils/healthScore";
import { showToast } from "../components/Toast";
import HealthInfoModal from "../components/HealthInfoModal";
import MessageComposer from "../components/MessageComposer";

type Props = NativeStackScreenProps<RootStackParamList, "PersonDetail">;
type TabKey = "timeline" | "info";

type EditableContact = ContactForm & {
  id?: string;
  createdAt?: string;
  addedAt?: string;
  updatedAt?: string;
  lastInteractionDate?: string;
  lastContactType?: string;
  location?: string;
  socials?: { platform: string; handle: string }[];
};

const PURPLE = colors.primary;
const SOFT_PURPLE = colors.primarySoft;
const BG = colors.bg;
const CARD = colors.card;
const BORDER = colors.border;
const TEXT = colors.text;
const MUTED = colors.textSub;
const GREEN = colors.success;
const ORANGE = colors.warning;
const RED = colors.danger;
const BLUE = "#2563EB";
const PINK = colors.secondary;

function initials(name?: string) {
  return (name || "?")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function avatarColor(name?: string) {
  const p = [colors.primary, "#2563EB", colors.success, colors.warning, "#0891B2", colors.secondary];
  let h = 0;
  for (const c of name || "") h += c.charCodeAt(0);
  return p[h % p.length];
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(iso?: string) {
  const d = parseDate(iso);
  if (!d) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

function prettyDate(value?: string) {
  const d = parseDate(value);
  if (!d) return value || "Belirtilmedi";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function relativeDate(value?: string) {
  const days = daysSince(value);
  if (days === null) return "Tarih yok";
  if (days === 0) return "Bugün";
  if (days === 1) return "Dün";
  return `${days} gün önce`;
}

function cleanText(value?: string) {
  return (value || "").trim();
}

function parseSocials(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [platform, ...rest] = line.split(":");
      return {
        platform: cleanText(rest.length ? platform : "Sosyal"),
        handle: cleanText(rest.length ? rest.join(":") : platform),
      };
    });
}

function socialsToText(socials?: { platform: string; handle: string }[]) {
  return (socials || []).map((s) => `${s.platform}: ${s.handle}`).join("\n");
}

export default function PersonDetailScreen({ navigation, route }: Props) {
  const initialContact = route.params.contact as EditableContact;

  const [contact, setContact] = useState<EditableContact>(initialContact);
  const [activeTab, setActiveTab] = useState<TabKey>("timeline");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [globalThreshold, setGlobalThreshold] = useState(14);
  const [intervalPickerOpen, setIntervalPickerOpen] = useState(false);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => setGlobalThreshold(s.reachOutThresholdDays || 14));
  }, []);

  const [form, setForm] = useState({
    fullName: contact.fullName || "",
    relationship: contact.relationship || "",
    jobTitle: contact.jobTitle || "",
    company: contact.company || "",
    phone: contact.phone || "",
    email: contact.email || "",
    birthday: contact.birthday || "",
    metWhere: contact.metWhere || "",
    lastContactDate: contact.lastContactDate || "",
    tags: contact.tags || "",
    notes: contact.notes || "",
    socialsText: socialsToText(contact.socials),
  });

  const color = avatarColor(contact.fullName);
  const days = daysSince(contact.lastContactDate);
  const interval = effectiveIntervalDays(contact, globalThreshold);
  const score = contact.lastContactDate ? centralHealthScore(contact, globalThreshold) : null;
  const scoreColor = score === null ? MUTED : healthScoreColor(score);

  const timeline = useMemo(() => {
    const items: { title: string; subtitle: string; icon: string; color: string }[] = [];

    if (contact.createdAt || contact.addedAt) {
      items.push({
        title: "Kişi CRM’e eklendi",
        subtitle: prettyDate(contact.createdAt || contact.addedAt),
        icon: "+",
        color: PURPLE,
      });
    }

    if (contact.metWhere) {
      items.push({
        title: "Tanışma bilgisi",
        subtitle: contact.metWhere,
        icon: "📍",
        color: PINK,
      });
    }

    if (contact.lastContactDate) {
      items.push({
        title: "Son etkileşim",
        subtitle: `${relativeDate(contact.lastContactDate)} · ${prettyDate(contact.lastContactDate)}`,
        icon: "💬",
        color: GREEN,
      });
    }

    if (contact.notes) {
      items.push({
        title: "Not eklendi",
        subtitle: contact.notes,
        icon: "✍️",
        color: ORANGE,
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Henüz ilişki geçmişi yok",
        subtitle: "İlk notunu veya son iletişim tarihini ekleyerek timeline’ı başlatabilirsin.",
        icon: "✨",
        color: PURPLE,
      });
    }

    return items;
  }, [contact]);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openPhone = () => {
    if (contact.phone) Linking.openURL(`tel:${contact.phone}`);
  };

  const openWhatsApp = () => {
    if (!contact.phone) return;
    const cleaned = contact.phone.replace(/[^0-9]/g, "");
    Linking.openURL(`https://wa.me/${cleaned}`);
  };

  const saveEdit = async () => {
    const updated: EditableContact = {
      ...contact,
      fullName: cleanText(form.fullName) || contact.fullName,
      relationship: cleanText(form.relationship),
      jobTitle: cleanText(form.jobTitle),
      company: cleanText(form.company),
      phone: cleanText(form.phone),
      email: cleanText(form.email),
      birthday: cleanText(form.birthday),
      metWhere: cleanText(form.metWhere),
      lastContactDate: cleanText(form.lastContactDate) || contact.lastContactDate,
      tags: cleanText(form.tags),
      notes: cleanText(form.notes),
      socials: parseSocials(form.socialsText),
      updatedAt: new Date().toISOString(),
    };

    const all = (await loadContacts()) as EditableContact[];
    const saved = all.map((item) => {
      const sameId = contact.id && item.id === contact.id;
      const samePerson = item.fullName === contact.fullName && (item.email || "") === (contact.email || "");
      return sameId || samePerson ? updated : item;
    });

    await saveContacts(saved as ContactForm[]);
    setContact(updated);
    setIsEditing(false);
    navigation.setParams({ contact: updated });
  };

  const saveInterval = async (days: number) => {
    const updated: EditableContact = { ...contact, reminderIntervalDays: days };
    const all = (await loadContacts()) as EditableContact[];
    const saved = all.map((item) => {
      const sameId = contact.id && item.id === contact.id;
      const samePerson = item.fullName === contact.fullName && (item.email || "") === (contact.email || "");
      return sameId || samePerson ? updated : item;
    });
    await saveContacts(saved as ContactForm[]);
    setContact(updated);
    setIntervalPickerOpen(false);
    navigation.setParams({ contact: updated });
  };

  const deleteContact = async () => {
    const all = (await loadContacts()) as EditableContact[];
    const updated = all.filter((item) => {
      const sameId = contact.id && item.id === contact.id;
      const samePerson = item.fullName === contact.fullName && (item.email || "") === (contact.email || "");
      return !(sameId || samePerson);
    });
    await saveContacts(updated as ContactForm[]);
    setShowDeleteConfirm(false);
    navigation.goBack();
    showToast("Kişi silindi");
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        type="detail"
        centerTitle={contact.fullName}
        onBack={() => navigation.goBack()}
        rightActions={
          isEditing
            ? [
                { label: "Sil", color: colors.danger, onPress: () => setShowDeleteConfirm(true) },
                { label: "Kaydet", color: colors.primary, onPress: saveEdit },
              ]
            : [{ label: "Düzenle", onPress: () => setIsEditing(true) }]
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={[styles.avatarGlow, { backgroundColor: color + "18" }]}> 
            <View style={[styles.avatar, { backgroundColor: color + "16", borderColor: color + "55" }]}> 
              <Text style={[styles.avatarText, { color }]}>{initials(contact.fullName)}</Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.editBlock}>
              <Input label="İsim" value={form.fullName} onChangeText={(v) => updateField("fullName", v)} />
              <Input label="İlişki" value={form.relationship} onChangeText={(v) => updateField("relationship", v)} />
              <Input label="Ünvan / okul" value={form.jobTitle} onChangeText={(v) => updateField("jobTitle", v)} />
              <Input label="Şirket / şehir" value={form.company} onChangeText={(v) => updateField("company", v)} />
            </View>
          ) : (
            <>
              <Text style={styles.name}>{contact.fullName}</Text>
              <Text style={styles.subtitle}>
                {[contact.jobTitle, contact.company].filter(Boolean).join(" · ") || "Kişi bilgisi eklenebilir"}
              </Text>
              {contact.relationship ? (
                <View style={styles.relationPill}>
                  <Text style={styles.relationText}>{contact.relationship}</Text>
                </View>
              ) : null}
            </>
          )}

          <View style={styles.healthMiniCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.healthLabelRow}>
                <Text style={styles.healthLabel}>İlişki Sağlığı</Text>
                <TouchableOpacity onPress={() => setHealthInfoOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.healthInfoIcon}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.healthSub}>{days === null ? "Son iletişim tarihi eklenmemiş" : `${days} gündür iletişim yok`}</Text>
            </View>
            <View style={[styles.healthCircle, { borderColor: scoreColor }]}> 
              <Text style={[styles.healthScore, { color: scoreColor }]}>{score === null ? "—" : score}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Action icon="📞" label="Ara" color={GREEN} disabled={!contact.phone} onPress={openPhone} />
            <Action icon="💬" label="WhatsApp" color={GREEN} disabled={!contact.phone} onPress={openWhatsApp} />
            <Action icon="✉️" label="Mail" color={PURPLE} disabled={!contact.email} onPress={() => contact.email && Linking.openURL(`mailto:${contact.email}`)} />
            <Action icon="✍️" label="Mesaj" color={ORANGE} onPress={() => setComposerVisible(true)} />
          </View>
        </View>

        <View style={styles.tabsWrap}>
          <TabButton title="Timeline" active={activeTab === "timeline"} onPress={() => setActiveTab("timeline")} />
          <TabButton title="Genel Bilgiler" active={activeTab === "info"} onPress={() => setActiveTab("info")} />
        </View>

        {activeTab === "timeline" ? (
          <View>
            <Text style={styles.sectionTitle}>İlişki Timeline</Text>
            <View style={styles.timelineCard}>
              {timeline.map((item, index) => (
                <View key={`${item.title}-${index}`} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, { backgroundColor: item.color }]}>
                      <Text style={styles.timelineIcon}>{item.icon}</Text>
                    </View>
                    {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{item.title}</Text>
                    <Text style={styles.timelineSub}>{item.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Notlar</Text>
            {isEditing ? (
              <Input
                label="Not"
                value={form.notes}
                onChangeText={(v) => updateField("notes", v)}
                multiline
                placeholder="Bu kişiyle ilgili hatırlamak istediğin detayları yaz..."
              />
            ) : (
              <View style={styles.cardSoft}>
                <Text style={contact.notes ? styles.notes : styles.emptyText}>
                  {contact.notes || "Henüz not yok. Düzenle’ye basarak not ekleyebilirsin."}
                </Text>
              </View>
            )}

            {isEditing ? (
              <>
                <Text style={styles.sectionTitle}>Timeline Bilgileri</Text>
                <Input label="Son iletişim tarihi" value={form.lastContactDate} onChangeText={(v) => updateField("lastContactDate", v)} placeholder="YYYY-MM-DD" />
                <Input label="Nerede tanıştınız?" value={form.metWhere} onChangeText={(v) => updateField("metWhere", v)} />
              </>
            ) : null}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
            {isEditing ? (
              <View style={styles.editBlockNoMargin}>
                <Input label="Telefon" value={form.phone} onChangeText={(v) => updateField("phone", v)} keyboardType="phone-pad" />
                <Input label="E-posta" value={form.email} onChangeText={(v) => updateField("email", v)} keyboardType="email-address" />
                <Input label="Doğum günü" value={form.birthday} onChangeText={(v) => updateField("birthday", v)} placeholder="GG/AA/YYYY" />
                <Input label="Etiketler" value={form.tags} onChangeText={(v) => updateField("tags", v)} placeholder="Yakın, iş, okul" />
                <Input
                  label="Sosyal medya"
                  value={form.socialsText}
                  onChangeText={(v) => updateField("socialsText", v)}
                  multiline
                  placeholder={"Instagram: @kullanici\nLinkedIn: linkedin.com/in/..."}
                />
              </View>
            ) : (
              <View style={styles.card}>
                {contact.phone ? <InfoRow icon="📞" label="Telefon" value={contact.phone} border /> : null}
                {contact.email ? <InfoRow icon="✉️" label="E-posta" value={contact.email} border={!!contact.birthday} /> : null}
                {contact.birthday ? <InfoRow icon="🎂" label="Doğum günü" value={contact.birthday} /> : null}
                {!contact.phone && !contact.email && !contact.birthday ? (
                  <Text style={styles.emptyInside}>Henüz personal info yok. Düzenle’ye basarak ekleyebilirsin.</Text>
                ) : null}
              </View>
            )}

            {!isEditing && contact.socials && contact.socials.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Sosyal Medya</Text>
                <View style={styles.card}>
                  {contact.socials.map((s, i) => (
                    <InfoRow key={`${s.platform}-${i}`} icon="🔗" label={s.platform} value={s.handle} border={i < (contact.socials?.length || 0) - 1} />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Tanışma & İlişki</Text>
            <View style={styles.card}>
              {contact.relationship ? <InfoRow icon="🤝" label="İlişki" value={contact.relationship} border /> : null}
              {contact.metWhere ? <InfoRow icon="📍" label="Nerede" value={contact.metWhere} border /> : null}
              {!contact.relationship && !contact.metWhere ? <Text style={styles.emptyInside}>Tanışma bilgisi eklenmemiş.</Text> : null}
              <InfoRow
                icon="🔔"
                label="İletişim aralığı"
                value={intervalLabel(interval)}
                onPress={() => setIntervalPickerOpen(true)}
              />
            </View>

            {contact.tags ? (
              <>
                <Text style={styles.sectionTitle}>Etiketler</Text>
                <View style={styles.tagsRow}>
                  {contact.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag, i) => (
                    <View key={`${tag}-${i}`} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.warningIcon}><Text style={styles.warningText}>!</Text></View>
            <Text style={styles.confirmTitle}>Bu kişiyi silmek istiyor musun?</Text>
            <Text style={styles.confirmDesc}>
              {contact.fullName} ile ilgili tüm ilişki geçmişi, notlar ve kayıtlı bilgiler silinecek. Bu işlem geri alınamaz.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(false)} activeOpacity={0.75}>
                <Text style={styles.cancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerBtn} onPress={deleteContact} activeOpacity={0.75}>
                <Text style={styles.dangerText}>Evet, sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={intervalPickerOpen} transparent animationType="fade" onRequestClose={() => setIntervalPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>İletişim aralığı</Text>
            <Text style={styles.confirmDesc}>Bu kişiyle ne sıklıkla iletişime geçmek istersin?</Text>
            <View style={styles.intervalOptions}>
              {INTERVAL_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.intervalOption, interval === preset.days && styles.intervalOptionActive]}
                  onPress={() => saveInterval(preset.days)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.intervalOptionText, interval === preset.days && styles.intervalOptionTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIntervalPickerOpen(false)} activeOpacity={0.75}>
              <Text style={styles.cancelText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />

      <MessageComposer
        visible={composerVisible}
        contact={contact}
        onClose={() => setComposerVisible(false)}
      />
    </View>
  );
}

function Action({ icon, label, color, onPress, disabled }: { icon: string; label: string; color: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.actionItem, disabled && styles.disabled]} onPress={disabled ? undefined : onPress} activeOpacity={0.72}>
      <View style={[styles.actionBox, { backgroundColor: color + "14", borderColor: color + "35" }]}> 
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TabButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ icon, label, value, border, onPress }: { icon: string; label: string; value: string; border?: boolean; onPress?: () => void }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.infoRow, border && styles.rowBorder]}
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
    >
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoText}>{value}</Text>
      </View>
      {onPress ? <Text style={styles.infoChevron}>›</Text> : null}
    </Wrapper>
  );
}

function Input({ label, value, onChangeText, placeholder, multiline, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType || "default"}
        style={[styles.input, multiline && styles.inputMulti]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: {
    paddingHorizontal: 22,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BG,
  },
  back: { color: PURPLE, fontSize: 15, fontWeight: "900" },
  editText: { color: PURPLE, fontSize: 15, fontWeight: "900" },
  saveText: { color: GREEN, fontSize: 15, fontWeight: "900" },
  deleteText: { color: RED, fontSize: 15, fontWeight: "900" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 18 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },

  heroCard: {
    marginTop: 14,
    backgroundColor: CARD,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    alignItems: "center",
    shadowColor: PURPLE,
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0.14,
    shadowRadius: 22,
    elevation: 4,
  },
  avatarGlow: { width: 112, height: 112, borderRadius: 56, alignItems: "center", justifyContent: "center" },
  avatar: { width: 92, height: 92, borderRadius: 46, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 29, fontWeight: "900" },
  name: { marginTop: 14, fontSize: 25, fontWeight: "900", color: TEXT, textAlign: "center" },
  subtitle: { marginTop: 5, color: MUTED, fontSize: 13, textAlign: "center" },
  relationPill: { marginTop: 12, backgroundColor: SOFT_PURPLE, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  relationText: { color: PURPLE, fontSize: 12, fontWeight: "900" },

  healthMiniCard: {
    marginTop: 18,
    width: "100%",
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  healthLabel: { fontSize: 13, fontWeight: "900", color: TEXT },
  healthLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  healthInfoIcon: { fontSize: 12, color: MUTED },
  healthSub: { marginTop: 4, color: MUTED, fontSize: 12 },
  healthCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  healthScore: { fontSize: 16, fontWeight: "900" },

  actions: { width: "100%", flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  actionItem: { alignItems: "center", width: "24%" },
  disabled: { opacity: 0.35 },
  actionBox: { width: 55, height: 55, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  actionIcon: { fontSize: 19 },
  actionLabel: { marginTop: 7, fontSize: 10.5, color: MUTED, fontWeight: "800", textAlign: "center" },

  tabsWrap: {
    marginTop: 18,
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 5,
    flexDirection: "row",
  },
  tabButton: { flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: "center" },
  tabButtonActive: { backgroundColor: CARD, shadowColor: PURPLE, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  tabText: { color: MUTED, fontSize: 13, fontWeight: "900" },
  tabTextActive: { color: PURPLE },

  sectionTitle: { marginTop: 22, marginBottom: 10, fontSize: 16, fontWeight: "900", color: TEXT },
  card: { backgroundColor: CARD, borderRadius: radius.card, borderWidth: 1, borderColor: BORDER, overflow: "hidden" },
  cardSoft: { backgroundColor: CARD, borderRadius: radius.card, borderWidth: 1, borderColor: BORDER, padding: 15 },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 20 },
  emptyInside: { padding: 15, color: MUTED, fontSize: 13, lineHeight: 20 },

  timelineCard: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, paddingVertical: 16, paddingRight: 14 },
  timelineRow: { flexDirection: "row", minHeight: 68 },
  timelineRail: { width: 56, alignItems: "center" },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  timelineIcon: { color: CARD, fontSize: 12, fontWeight: "900" },
  timelineLine: { flex: 1, width: 2, backgroundColor: BORDER, marginTop: 5 },
  timelineContent: { flex: 1, paddingBottom: 18 },
  timelineTitle: { color: TEXT, fontSize: 14, fontWeight: "900" },
  timelineSub: { marginTop: 4, color: colors.textSub, fontSize: 12.5, lineHeight: 19 },

  notes: { color: colors.textSub, fontSize: 13, lineHeight: 21 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 15, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  infoIcon: { width: 28, fontSize: 16 },
  infoLabel: { color: MUTED, fontSize: 11, fontWeight: "800", marginBottom: 3 },
  infoText: { color: colors.textSub, fontSize: 13, fontWeight: "500" },
  infoChevron: { fontSize: 20, color: MUTED },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { backgroundColor: SOFT_PURPLE, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  tagText: { color: PURPLE, fontSize: 12, fontWeight: "800" },

  editBlock: { width: "100%", marginTop: 16 },
  editBlockNoMargin: { gap: 0 },
  inputWrap: { marginBottom: 10 },
  inputLabel: { marginBottom: 6, color: TEXT, fontSize: 12, fontWeight: "900" },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === "ios" ? 12 : 9,
    color: TEXT,
    fontSize: 13,
  },
  inputMulti: { minHeight: 94, textAlignVertical: "top" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(25,24,38,0.38)", alignItems: "center", justifyContent: "center", padding: 22 },
  confirmCard: { width: "100%", backgroundColor: CARD, borderRadius: 24, padding: 20, alignItems: "center" },
  warningIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: RED + "15", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  warningText: { color: RED, fontSize: 24, fontWeight: "900" },
  confirmTitle: { color: TEXT, fontSize: 18, fontWeight: "900", textAlign: "center" },
  confirmDesc: { marginTop: 8, color: MUTED, fontSize: 13, lineHeight: 20, textAlign: "center" },
  confirmActions: { flexDirection: "row", gap: 10, marginTop: 18, width: "100%" },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center" },
  dangerBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: RED, alignItems: "center" },
  cancelText: { color: TEXT, fontWeight: "900" },
  dangerText: { color: CARD, fontWeight: "900" },

  intervalOptions: { width: "100%", gap: 8, marginTop: 18, marginBottom: 16 },
  intervalOption: {
    paddingVertical: 13, borderRadius: 14,
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: BORDER,
    alignItems: "center",
  },
  intervalOptionActive: { backgroundColor: colors.primarySoft, borderColor: PURPLE + "60" },
  intervalOptionText: { fontSize: 14, fontWeight: "600", color: TEXT },
  intervalOptionTextActive: { color: PURPLE, fontWeight: "800" },
});
