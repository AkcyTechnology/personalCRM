import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { addContact } from "../data/contacts";

// ─── Theme ───────────────────────────────────────────────────────────────────
const C = {
  purple:       "#7C3AED",
  purpleLight:  "#EDE9FF",
  purpleMid:    "#A78BFA",
  bg:           "#F6F5FB",
  card:         "#FFFFFF",
  border:       "#E5E1F5",
  text:         "#18172A",
  sub:          "#6B6884",
  muted:        "#A09CB8",
  error:        "#EF4444",
  errorBg:      "#FEF2F2",
  errorBorder:  "#FCA5A5",
  success:      "#10B981",
  divider:      "#F0EEF9",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type SocialEntry = { platform: string; handle: string };

export type ContactForm = {
  fullName:        string;
  company:         string;
  jobTitle:        string;
  birthday:        string;
  relationship:    string;
  metWhere:        string;
  phone:           string;
  email:           string;
  socials:         SocialEntry[];
  tags:            string;
  priority:        string;
  notes:           string;
  lastContactDate: string; // ISO date string, örn. "2025-05-10"
};

const EMPTY: ContactForm = {
  fullName:        "",
  company:         "",
  jobTitle:        "",
  birthday:        "",
  relationship:    "",
  metWhere:        "",
  phone:           "",
  email:           "",
  socials:         [{ platform: "LinkedIn", handle: "" }],
  tags:            "",
  priority:        "",
  notes:           "",
  lastContactDate: new Date().toISOString().split("T")[0],
};

// ─── Seçenek Listeleri ────────────────────────────────────────────────────────
const RELATIONSHIPS = [
  { label: "Arkadaş",        emoji: "👋" },
  { label: "İş arkadaşı",   emoji: "💼" },
  { label: "Mentor",         emoji: "🎓" },
  { label: "Mentee",         emoji: "🌱" },
  { label: "Müşteri",        emoji: "🤝" },
  { label: "Partner",        emoji: "🔗" },
  { label: "Aile",           emoji: "❤️" },
  { label: "Tanıdık",        emoji: "😊" },
];

const MET_WHERE = [
  { label: "Etkinlik / Konferans", emoji: "🎤" },
  { label: "İş ortamı",           emoji: "🏢" },
  { label: "Okul / Üniversite",   emoji: "🎓" },
  { label: "Ortak arkadaş",       emoji: "👥" },
  { label: "LinkedIn",             emoji: "💼" },
  { label: "Twitter / X",          emoji: "🐦" },
  { label: "Online topluluk",      emoji: "🌐" },
  { label: "Diğer",                emoji: "📍" },
];

const PRIORITY_OPTIONS = [
  { label: "Yüksek",  emoji: "🔥", color: "#EF4444" },
  { label: "Orta",    emoji: "⚡", color: "#F59E0B" },
  { label: "Normal",  emoji: "💙", color: C.purple   },
];

const SOCIAL_PLATFORMS = ["LinkedIn", "Twitter/X", "Instagram", "GitHub", "Website", "Diğer"];

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = NativeStackScreenProps<RootStackParamList, "AddContact">;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AddContactScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [form, setForm]               = useState<ContactForm>(EMPTY);
  const [errors, setErrors]           = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [discardModal, setDiscardModal] = useState(false);

  // dropdown states
  const [relOpen, setRelOpen]       = useState(false);
  const [metOpen, setMetOpen]       = useState(false);
  const [prioOpen, setPrioOpen]     = useState(false);

  const isDirty = JSON.stringify(form) !== JSON.stringify(EMPTY);

  const set = useCallback(<K extends keyof ContactForm>(key: K, val: ContactForm[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Partial<Record<keyof ContactForm, string>> = {};
    if (!form.fullName.trim())     e.fullName = "Ad Soyad zorunlu alandır.";
    if (!form.relationship)        e.relationship = "Lütfen bir ilişki türü seçin.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    await addContact({ ...form });
    navigation.goBack();
  };

  const handleBackPress = () => {
    if (isDirty) {
      setDiscardModal(true);
    } else {
      navigation.goBack();
    }
  };

  // ── Social helpers ──────────────────────────────────────────────────────────
  const updateSocial = (i: number, key: keyof SocialEntry, val: string) => {
    set("socials", form.socials.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  };

  const addSocial = () => set("socials", [...form.socials, { platform: "LinkedIn", handle: "" }]);

  const removeSocial = (i: number) => {
    const next = form.socials.filter((_, idx) => idx !== i);
    set("socials", next.length ? next : [{ platform: "LinkedIn", handle: "" }]);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── App Bar ── */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backBtn} activeOpacity={0.7}>
          <View style={styles.backArrow} />
          <Text style={styles.backText}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Kişi Ekle</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Form ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ════════ TEMEL BİLGİLER ════════ */}
          <SectionHeader title="Temel Bilgiler" />

          <FieldInput
            label="Ad Soyad"
            required
            value={form.fullName}
            error={errors.fullName}
            placeholder="Ahmet Yılmaz"
            onChangeText={v => set("fullName", v)}
          />
          <FieldInput
            label="Şirket / Kurum"
            value={form.company}
            placeholder="Acme A.Ş."
            onChangeText={v => set("company", v)}
          />
          <FieldInput
            label="Unvan / Pozisyon"
            value={form.jobTitle}
            placeholder="Yazılım Mühendisi"
            onChangeText={v => set("jobTitle", v)}
          />
          <FieldInput
            label="Doğum Tarihi"
            value={form.birthday}
            placeholder="GG/AA/YYYY"
            onChangeText={v => set("birthday", v)}
          />

          {/* ════════ İLİŞKİ ════════ */}
          <SectionHeader title="İlişki" />

          <DropdownField
            label="Bu kişi senin için kim?"
            required
            placeholder="İlişki türü seç..."
            value={form.relationship}
            error={errors.relationship}
            open={relOpen}
            onToggle={() => { setRelOpen(p => !p); setMetOpen(false); setPrioOpen(false); }}
            onClear={() => set("relationship", "")}
          >
            <View style={styles.dropGrid}>
              {RELATIONSHIPS.map(r => (
                <TouchableOpacity
                  key={r.label}
                  style={[styles.dropGridItem, form.relationship === r.label && styles.dropGridItemActive]}
                  onPress={() => { set("relationship", r.label); setRelOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropGridEmoji}>{r.emoji}</Text>
                  <Text style={[styles.dropGridLabel, form.relationship === r.label && styles.dropGridLabelActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </DropdownField>

          <DropdownField
            label="Nerede tanıştınız?"
            placeholder="Tanışma yeri seç..."
            value={form.metWhere}
            open={metOpen}
            onToggle={() => { setMetOpen(p => !p); setRelOpen(false); setPrioOpen(false); }}
            onClear={() => set("metWhere", "")}
          >
            <View style={styles.dropList}>
              {MET_WHERE.map(m => (
                <TouchableOpacity
                  key={m.label}
                  style={[styles.dropListItem, form.metWhere === m.label && styles.dropListItemActive]}
                  onPress={() => { set("metWhere", m.label); setMetOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropListEmoji}>{m.emoji}</Text>
                  <Text style={[styles.dropListText, form.metWhere === m.label && styles.dropListTextActive]}>
                    {m.label}
                  </Text>
                  {form.metWhere === m.label && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </DropdownField>

          <DropdownField
            label="Öncelik"
            placeholder="Öncelik seviyesi seç..."
            value={form.priority}
            open={prioOpen}
            onToggle={() => { setPrioOpen(p => !p); setRelOpen(false); setMetOpen(false); }}
            onClear={() => set("priority", "")}
          >
            <View style={styles.dropRow}>
              {PRIORITY_OPTIONS.map(p => (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.dropRowItem, form.priority === p.label && { borderColor: p.color, backgroundColor: p.color + "15" }]}
                  onPress={() => { set("priority", p.label); setPrioOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropRowEmoji}>{p.emoji}</Text>
                  <Text style={[styles.dropRowLabel, form.priority === p.label && { color: p.color, fontWeight: "700" }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </DropdownField>

          {/* ════════ İLETİŞİM ════════ */}
          <SectionHeader title="İletişim" />

          <FieldInput
            label="Telefon"
            value={form.phone}
            placeholder="+90 5xx xxx xx xx"
            keyboardType="phone-pad"
            onChangeText={v => set("phone", v)}
          />
          <FieldInput
            label="E-posta"
            value={form.email}
            placeholder="ornek@email.com"
            keyboardType="email-address"
            onChangeText={v => set("email", v)}
          />

          {/* ════════ SOSYAL MEDYA ════════ */}
          <SectionHeader title="Sosyal Medya" />

          {form.socials.map((social, i) => (
            <View key={i} style={styles.socialCard}>
              <View style={styles.socialCardHeader}>
                <Text style={styles.socialCardTitle}>Hesap {i + 1}</Text>
                {form.socials.length > 1 && (
                  <TouchableOpacity onPress={() => removeSocial(i)} activeOpacity={0.7}>
                    <Text style={styles.socialRemove}>Kaldır</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Platform chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformRow}>
                {SOCIAL_PLATFORMS.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.platformChip, social.platform === p && styles.platformChipActive]}
                    onPress={() => updateSocial(i, "platform", p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.platformChipText, social.platform === p && styles.platformChipTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.socialInputWrap}>
                <TextInput
                  style={styles.socialInput}
                  value={social.handle}
                  onChangeText={v => updateSocial(i, "handle", v)}
                  placeholder="Kullanıcı adı veya URL"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addSocialBtn} onPress={addSocial} activeOpacity={0.7}>
            <Text style={styles.addSocialText}>+ Hesap ekle</Text>
          </TouchableOpacity>

          {/* ════════ ETİKETLER ════════ */}
          <SectionHeader title="Etiketler" />

          <FieldInput
            label="Etiketler"
            value={form.tags}
            placeholder="yatırımcı, mentor, teknoloji  (virgülle ayır)"
            onChangeText={v => set("tags", v)}
          />

          {/* ════════ NOTLAR ════════ */}
          <SectionHeader title="Notlar" />

          <FieldInput
            label="Serbest not"
            value={form.notes}
            placeholder={"İlk izlenim, ortak ilgi alanları,\ntakip edilecek konular..."}
            multiline
            onChangeText={v => set("notes", v)}
          />

          {/* alt boşluk — butonların üstüne gelmemesi için */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Sticky Buttons ── */}
        <View style={[styles.stickyBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleBackPress} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, !form.fullName.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!form.fullName.trim()}
          >
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Discard Confirm Modal ── */}
      <DiscardModal
        visible={discardModal}
        onKeep={() => setDiscardModal(false)}
        onDiscard={() => { setDiscardModal(false); setForm(EMPTY); navigation.goBack(); }}
      />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

function FieldInput({
  label, required, value, error, placeholder, multiline, keyboardType, onChangeText,
}: {
  label: string; required?: boolean; value: string; error?: string;
  placeholder?: string; multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
  onChangeText: (v: string) => void;
}) {
  const hasError = !!error;
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {required && <Text style={styles.requiredBadge}>Zorunlu</Text>}
      </View>
      <TextInput
        style={[
          styles.fieldInput,
          multiline && styles.fieldTextArea,
          hasError && styles.fieldInputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        textAlignVertical={multiline ? "top" : "center"}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
      />
      {hasError && (
        <View style={styles.errorRow}>
          <Text style={styles.errorDot}>●</Text>
          <Text style={styles.errorMsg}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function DropdownField({
  label, required, placeholder, value, error, open, onToggle, onClear, children,
}: {
  label: string; required?: boolean; placeholder: string; value: string;
  error?: string; open: boolean;
  onToggle: () => void; onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {required && <Text style={styles.requiredBadge}>Zorunlu</Text>}
      </View>

      <TouchableOpacity
        style={[styles.dropTrigger, error && styles.fieldInputError, open && styles.dropTriggerOpen]}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropTriggerText, !value && { color: C.muted }]}>
          {value || placeholder}
        </Text>
        <View style={styles.dropTriggerRight}>
          {!!value && (
            <TouchableOpacity
              onPress={e => { e.stopPropagation?.(); onClear(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.dropClear}>✕</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.dropChevron, open && styles.dropChevronOpen]}>›</Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.dropPanel}>
          {children}
        </View>
      )}

      {!!error && (
        <View style={styles.errorRow}>
          <Text style={styles.errorDot}>●</Text>
          <Text style={styles.errorMsg}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function DiscardModal({
  visible, onKeep, onDiscard,
}: {
  visible: boolean; onKeep: () => void; onDiscard: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onKeep}>
        <Pressable style={styles.discardBox}>
          <View style={styles.discardIcon}>
            <Text style={styles.discardIconText}>⚠️</Text>
          </View>
          <Text style={styles.discardTitle}>Değişiklikler kaybolacak</Text>
          <Text style={styles.discardDesc}>
            Kaydetmeden çıkarsan girdiğin bilgiler silinecek. Devam etmek istiyor musun?
          </Text>
          <TouchableOpacity style={styles.discardKeepBtn} onPress={onKeep} activeOpacity={0.8}>
            <Text style={styles.discardKeepText}>Düzenlemeye devam et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.discardLeaveBtn} onPress={onDiscard} activeOpacity={0.8}>
            <Text style={styles.discardLeaveText}>Sil ve çık</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // App Bar
  appBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  backArrow: {
    width: 8,
    height: 8,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: C.purple,
    transform: [{ rotate: "45deg" }],
    marginRight: 2,
  },
  backText: {
    fontSize: 15,
    color: C.purple,
    fontWeight: "500",
  },
  appBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },

  // Scroll
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },

  // Badge
  badgeWrap: {
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.purpleMid + "55",
  },
  badgeText: {
    fontSize: 28,
    fontWeight: "800",
    color: C.purple,
    letterSpacing: 1,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Section Header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.purple,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },

  // Field
  fieldWrap: { marginBottom: 14 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.sub,
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: C.purple,
    backgroundColor: C.purpleLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  fieldInput: {
    height: 48,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.text,
  },
  fieldTextArea: {
    height: 112,
    paddingTop: 13,
  },
  fieldInputError: {
    borderColor: C.errorBorder,
    backgroundColor: C.errorBg,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 5,
  },
  errorDot: {
    fontSize: 7,
    color: C.error,
  },
  errorMsg: {
    fontSize: 12,
    color: C.error,
    fontWeight: "600",
  },

  // Dropdown Trigger
  dropTrigger: {
    height: 48,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropTriggerOpen: {
    borderColor: C.purple,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  dropTriggerText: {
    fontSize: 15,
    color: C.text,
    flex: 1,
  },
  dropTriggerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dropClear: {
    fontSize: 12,
    color: C.muted,
    padding: 2,
  },
  dropChevron: {
    fontSize: 20,
    color: C.muted,
    transform: [{ rotate: "90deg" }],
    lineHeight: 22,
  },
  dropChevronOpen: {
    transform: [{ rotate: "270deg" }],
    color: C.purple,
  },
  dropPanel: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: C.purple,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
  },

  // Grid dropdown (relationship)
  dropGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    gap: 8,
  },
  dropGridItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  dropGridItemActive: {
    borderColor: C.purple,
    backgroundColor: C.purpleLight,
  },
  dropGridEmoji: { fontSize: 18 },
  dropGridLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: C.sub,
    flex: 1,
  },
  dropGridLabelActive: {
    color: C.purple,
    fontWeight: "700",
  },

  // List dropdown (met where)
  dropList: { paddingVertical: 4 },
  dropListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dropListItemActive: {
    backgroundColor: C.purpleLight,
  },
  dropListEmoji: { fontSize: 16 },
  dropListText: { fontSize: 14, color: C.text, flex: 1, fontWeight: "500" },
  dropListTextActive: { color: C.purple, fontWeight: "700" },
  checkmark: { fontSize: 15, color: C.purple, fontWeight: "700" },

  // Row dropdown (priority)
  dropRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  dropRowItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 4,
  },
  dropRowEmoji: { fontSize: 20 },
  dropRowLabel: { fontSize: 13, fontWeight: "500", color: C.sub },

  // Social
  socialCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  socialCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  socialCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
  },
  socialRemove: {
    fontSize: 13,
    color: C.error,
    fontWeight: "700",
  },
  platformRow: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 6,
    flexDirection: "row",
  },
  platformChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  platformChipActive: {
    backgroundColor: C.purple,
    borderColor: C.purple,
  },
  platformChipText: { fontSize: 12, fontWeight: "600", color: C.sub },
  platformChipTextActive: { color: "#fff" },
  socialInputWrap: {
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  socialInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
  },
  addSocialBtn: {
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 4,
  },
  addSocialText: {
    fontSize: 14,
    color: C.purple,
    fontWeight: "700",
  },

  // Sticky bar
  stickyBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: C.sub,
  },
  saveBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    backgroundColor: C.purpleMid + "80",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Discard Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,8,30,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  discardBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  discardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  discardIconText: { fontSize: 26 },
  discardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 8,
  },
  discardDesc: {
    fontSize: 14,
    color: C.sub,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  discardKeepBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  discardKeepText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  discardLeaveBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    backgroundColor: C.errorBg,
    borderWidth: 1,
    borderColor: C.errorBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  discardLeaveText: {
    color: C.error,
    fontWeight: "800",
    fontSize: 15,
  },
});
