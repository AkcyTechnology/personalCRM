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
  Alert,
  StatusBar,
  FlatList,
} from "react-native";
import { useState, useCallback, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ContactsPermissionError,
  ContactsUnavailableError,
  listDeviceContactsAsync,
  pickDeviceContactAsync,
  type DeviceContact,
} from "../utils/deviceContacts";
import DateField from "../components/DateField";
import { toISODate } from "../utils/dates";
import { toSafeWebUrl } from "../utils/links";
import { ensureNotificationPermissionAsync } from "../utils/notifications";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { addContact } from "../data/contacts";
import { loadSettings } from "../data/userSettings";
import {
  DEFAULT_RELATIONSHIPS,
  loadCustomRelationships,
  addCustomRelationship,
  removeCustomRelationship,
} from "../data/relationshipTypes";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { radius } from "../theme/radius";
import { INTERVAL_PRESETS } from "../utils/reminderInterval";
import { showToast } from "../components/Toast";
import PermissionDeniedModal from "../components/PermissionDeniedModal";

// ── Types ─────────────────────────────────────────────────────────────────────

type SocialEntry = { platform: string; handle: string };

export type InteractionType = "call" | "whatsapp" | "email" | "meeting" | "message" | "other";

export type Interaction = {
  id:    string;
  /** YYYY-MM-DD */
  date:  string;
  type:  InteractionType;
  note?: string;
};

export type ContactForm = {
  id?:                    string;
  fullName:               string;
  company:                string;
  jobTitle:               string;
  birthday:               string;
  relationship:           string;
  closenessTag?:          string;
  metWhere:               string;
  phone:                  string;
  email:                  string;
  website:                string;
  linkedin?:              string;
  instagram:              string;
  city:                   string;
  socials:                SocialEntry[];
  tags:                   string;
  priority:               string;
  lastContactDate:        string;
  reminderFreq:           string;
  reminderIntervalDays?:  number;
  reminderIntervalStart?: string;
  reminderEnabled?:       boolean;
  snoozedUntil?:          string;
  notes:                  string;
  createdAt?:             string;
  updatedAt?:             string;
  order?:                 number;
  interactions?:          Interaction[];
};

const EMPTY: ContactForm = {
  fullName:        "",
  company:         "",
  jobTitle:        "",
  birthday:        "",
  relationship:    "",
  closenessTag:    "",
  metWhere:        "",
  phone:           "",
  email:           "",
  website:         "",
  linkedin:        "",
  instagram:       "",
  city:            "",
  socials:         [],
  tags:            "",
  priority:        "",
  lastContactDate: "",
  reminderFreq:    "",
  notes:           "",
};

// ── Data ──────────────────────────────────────────────────────────────────────

const MET_WHERE = [
  "İş", "Etkinlik", "Okul", "Sosyal çevre", "Online", "Ortak arkadaş",
];

const PRIORITIES = ["Düşük", "Orta", "Yüksek"];

const LAST_CONTACT_OPTIONS = [
  "Bugün", "Dün", "1 hafta önce", "1 ay önce", "Özel tarih",
];

const CUSTOM_INTERVAL = "Özel aralık";

const SUGGESTED_TAGS = [
  "pazarlama", "teknoloji", "yatırımcı", "yazılım",
  "tasarım", "mentor", "girişim", "fintech",
];

// ── Screen ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, "AddContact">;

export default function AddContactScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [form, setForm]             = useState<ContactForm>(EMPTY);
  const [errors, setErrors]         = useState<Partial<Record<keyof ContactForm, string>>>({});
  const [discardModal, setDiscard]  = useState(false);
  const [importedName, setImported] = useState("");
  const [customLastContact, setCustomLastContact] = useState(false);
  const [notesOpen, setNotesOpen]   = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customInterval, setCustomInterval] = useState(false);
  const [customIntervalText, setCustomIntervalText] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [permissionModal, setPermissionModal] = useState(false);
  const [customRelationships, setCustomRelationships] = useState<string[]>([]);
  const [relationshipManagerOpen, setRelationshipManagerOpen] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      if (s.defaultContactIntervalDays) {
        setForm((prev) => ({ ...prev, reminderIntervalDays: s.defaultContactIntervalDays }));
      }
    });
    loadCustomRelationships().then(setCustomRelationships);
  }, []);

  const relationships = [...DEFAULT_RELATIONSHIPS, ...customRelationships];

  const isDirty = JSON.stringify(form) !== JSON.stringify(EMPTY) || selectedTags.length > 0;

  const set = useCallback(<K extends keyof ContactForm>(key: K, val: ContactForm[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  const handleAddRelationship = async (label: string) => {
    setCustomRelationships(await addCustomRelationship(label));
  };

  const handleRemoveRelationship = async (label: string) => {
    setCustomRelationships(await removeCustomRelationship(label));
    if (form.relationship === label) set("relationship", "");
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // ── Import from contacts ───────────────────────────────────────────────────
  const handleContactsError = (error: unknown) => {
    if (error instanceof ContactsPermissionError) {
      showToast("Rehber izni verilmedi");
      setPermissionModal(true);
    } else if (error instanceof ContactsUnavailableError) {
      Alert.alert("Rehber kullanılamıyor", error.message);
    } else {
      showToast("Bir sorun oluştu. Lütfen tekrar dene.");
    }
  };

  const handleImport = async () => {
    try {
      // Önce sistemin kişi seçicisi: yalnızca seçilen kişi uygulamaya gelir.
      const picked = await pickDeviceContactAsync();
      if (picked) handlePickDeviceContact(picked);
      return;
    } catch (error) {
      if (error instanceof ContactsPermissionError || error instanceof ContactsUnavailableError) {
        return handleContactsError(error);
      }
    }
    // Sistem seçicisi yoksa uygulama içi listeye düş
    try {
      const data = await listDeviceContactsAsync();
      if (!data.length) {
        Alert.alert("Rehber boş", "Cihazında kayıtlı kişi bulunamadı.");
        return;
      }
      setDeviceContacts(data);
      setPickerVisible(true);
    } catch (error) {
      handleContactsError(error);
    }
  };

  const handlePickDeviceContact = (picked: DeviceContact) => {
    const { name, phone, email, company, jobTitle: title, birthday } = picked;
    if (name) {
      setForm(prev => ({
        ...prev,
        fullName: name,
        phone,
        email,
        company: company || prev.company,
        jobTitle: title || prev.jobTitle,
        birthday: /^\d{2}\/\d{2}\/\d{4}$/.test(birthday) ? birthday : prev.birthday,
      }));
      setImported(name);
      setErrors({});
    }
    setPickerVisible(false);
  };

  // ── Validation + save ─────────────────────────────────────────────────────
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const BIRTHDAY_RE = /^\d{2}\/\d{2}\/\d{4}$/;

  const emailValid = !form.email.trim() || EMAIL_RE.test(form.email.trim());
  const birthdayValid = !form.birthday.trim() || BIRTHDAY_RE.test(form.birthday.trim());
  // Rehberden aktarılan kişilerde ilişki türü zorunlu değil — formu doldurmadan hızlıca kaydedilebilsin.
  const relationshipRequired = !importedName;
  const canSave = !!form.fullName.trim() && emailValid && birthdayValid
    && (!relationshipRequired || !!form.relationship);

  const validate = () => {
    const e: Partial<Record<keyof ContactForm, string>> = {};
    if (!form.fullName.trim()) e.fullName = "Ad Soyad zorunlu.";
    if (relationshipRequired && !form.relationship) e.relationship = "İlişki türü seçin.";
    if (!emailValid)          e.email = "Geçerli bir e-posta adresi gir.";
    if (!birthdayValid)       e.birthday = "Tarihi GG/AA/YYYY biçiminde gir.";
    if (form.website.trim() && !toSafeWebUrl(form.website)) e.website = "Geçerli bir web adresi gir (https://…).";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await addContact({
        ...form,
        website: form.website.trim() ? toSafeWebUrl(form.website) ?? "" : "",
        tags: selectedTags.join(", "),
        lastContactDate: form.lastContactDate || toISODate(new Date()),
      });
    } catch {
      showToast("Kişi kaydedilemedi. Lütfen tekrar dene.");
      return;
    }
    navigation.goBack();
    showToast("Kişi kaydedildi");
    // Hatırlatıcının işe yaraması için izni tam bu anda iste
    if (form.reminderEnabled !== false) ensureNotificationPermissionAsync();
  };

  const handleBack = () => {
    if (isDirty) setDiscard(true);
    else navigation.goBack();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* App bar */}
      <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.appBarSide} activeOpacity={0.7}>
          <Text style={styles.appBarBack}>Geri</Text>
        </TouchableOpacity>
        <Text style={styles.appBarTitle}>Kişi Ekle</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.appBarSide}
          activeOpacity={0.7}
          disabled={!canSave}
        >
          <Text style={[styles.appBarSave, !canSave && styles.appBarSaveDisabled]}>
            Kaydet
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Section 1: Import ── */}
          <TouchableOpacity style={styles.importCard} onPress={handleImport} activeOpacity={0.8}>
            <View style={styles.importIconWrap}>
              <ContactBookIcon />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.importTitle}>Rehberden kişi seç</Text>
              <Text style={styles.importSub}>Telefon rehberinden bilgileri hızlıca aktar</Text>
            </View>
            <ChevronRight />
          </TouchableOpacity>

          {importedName ? (
            <View style={styles.importedPreview}>
              <View style={styles.importedAvatar}>
                <Text style={styles.importedAvatarText}>{initials(importedName)}</Text>
              </View>
              <View>
                <Text style={styles.importedName}>{importedName}</Text>
                {form.phone ? <Text style={styles.importedPhone}>{form.phone}</Text> : null}
              </View>
              <View style={styles.importedBadge}>
                <Text style={styles.importedBadgeText}>Aktarıldı</Text>
              </View>
            </View>
          ) : null}

          {/* ── Section 2: Basic info ── */}
          <SectionLabel title="Temel Bilgiler" />

          <FieldGroup>
            <Field
              label="Ad Soyad"
              required
              value={form.fullName}
              error={errors.fullName}
              placeholder="Ahmet Yılmaz"
              onChangeText={v => set("fullName", v)}
            />
            <Divider />
            <Field
              label="Şirket / Kurum"
              value={form.company}
              placeholder="Acme A.Ş."
              onChangeText={v => set("company", v)}
            />
            <Divider />
            <Field
              label="Unvan / Pozisyon"
              value={form.jobTitle}
              placeholder="Yazılım Mühendisi"
              onChangeText={v => set("jobTitle", v)}
            />
            <Divider />
            <View style={{ paddingTop: 12 }}>
              <DateField
                label="Doğum Tarihi"
                format="birthday"
                value={form.birthday}
                error={errors.birthday}
                placeholder="Tarih seç"
                maximumDate={new Date()}
                onChange={v => set("birthday", v)}
              />
            </View>
            <Divider />
            <Field
              label="Şehir"
              value={form.city}
              placeholder="İstanbul"
              onChangeText={v => set("city", v)}
            />
          </FieldGroup>

          <FieldGroup>
            <Field
              label="Telefon"
              value={form.phone}
              placeholder="+90 5xx xxx xx xx"
              keyboardType="phone-pad"
              onChangeText={v => set("phone", v)}
            />
            <Divider />
            <Field
              label="E-posta"
              value={form.email}
              error={errors.email}
              placeholder="ornek@email.com"
              keyboardType="email-address"
              onChangeText={v => set("email", v)}
            />
            <Divider />
            <Field
              label="Web sitesi"
              value={form.website}
              error={errors.website}
              placeholder="https://..."
              keyboardType="url"
              onChangeText={v => set("website", v)}
            />
            <Divider />
            <Field
              label="LinkedIn"
              value={form.linkedin ?? ""}
              placeholder="linkedin.com/in/kullanici"
              autoCapitalize="none"
              onChangeText={v => set("linkedin", v)}
            />
            <Divider />
            <Field
              label="Instagram"
              value={form.instagram}
              placeholder="@kullanici"
              autoCapitalize="none"
              onChangeText={v => set("instagram", v)}
            />
          </FieldGroup>

          {/* ── Section 3: Relationship ── */}
          <SectionLabel title="İlişki" />

          <ChipSection
            label="Bu kişi senin için kim?"
            required={relationshipRequired}
            error={errors.relationship}
            chips={relationships}
            selected={form.relationship}
            onSelect={v => set("relationship", v === form.relationship ? "" : v)}
            onManage={() => setRelationshipManagerOpen(true)}
          />

          <FieldGroup>
            <Field
              label="Yakınlık"
              value={form.closenessTag ?? ""}
              placeholder="örn. Çok yakın, Yüzeysel"
              onChangeText={v => set("closenessTag", v)}
            />
          </FieldGroup>

          <ChipSection
            label="Nerede tanıştınız?"
            chips={MET_WHERE}
            selected={form.metWhere}
            onSelect={v => set("metWhere", v === form.metWhere ? "" : v)}
          />

          <ChipSection
            label="Öncelik"
            chips={PRIORITIES}
            selected={form.priority}
            onSelect={v => set("priority", v === form.priority ? "" : v)}
            colorMap={{ Düşük: "#6B7280", Orta: "#D97706", Yüksek: "#DC2626" }}
          />

          {/* ── Section 4: Activity & reminders ── */}
          <SectionLabel title="Son İletişim ve Hatırlatıcı" />

          <ChipSection
            label="En son ne zaman görüştünüz?"
            chips={LAST_CONTACT_OPTIONS}
            selected={form.lastContactDate}
            onSelect={v => {
              if (v === "Özel tarih") {
                setCustomLastContact(true);
                return;
              }
              setCustomLastContact(false);
              const map: Record<string, string> = {
                "Bugün":       toISODate(new Date()),
                "Dün":         daysAgo(1),
                "1 hafta önce": daysAgo(7),
                "1 ay önce":   daysAgo(30),
              };
              set("lastContactDate", map[v] ?? v);
            }}
            displayMap={{
              [toISODate(new Date())]: "Bugün",
              [daysAgo(1)]: "Dün",
              [daysAgo(7)]: "1 hafta önce",
              [daysAgo(30)]: "1 ay önce",
            }}
          />

          {customLastContact || (form.lastContactDate && ![toISODate(new Date()), daysAgo(1), daysAgo(7), daysAgo(30)].includes(form.lastContactDate)) ? (
            <View style={styles.card}>
              <DateField
                label="Son görüşme tarihi"
                format="iso"
                value={form.lastContactDate}
                maximumDate={new Date()}
                onChange={v => set("lastContactDate", v)}
              />
            </View>
          ) : null}

          <View style={styles.card}>
            <Text style={styles.chipLabel}>Tekrar ne zaman hatırlatayım?</Text>
            <View style={styles.chipRow}>
              {INTERVAL_PRESETS.map(preset => {
                const active = !customInterval && form.reminderIntervalDays === preset.days;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      setCustomInterval(false);
                      setCustomIntervalText("");
                      set("reminderIntervalDays", preset.days);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.chip, customInterval && styles.chipActive]}
                onPress={() => setCustomInterval(true)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, customInterval && styles.chipTextActive]}>
                  {CUSTOM_INTERVAL}
                </Text>
              </TouchableOpacity>
            </View>

            {customInterval && (
              <View style={styles.customIntervalRow}>
                <Text style={styles.customIntervalLabel}>Her</Text>
                <TextInput
                  style={styles.customIntervalInput}
                  value={customIntervalText}
                  onChangeText={(v) => {
                    const digits = v.replace(/[^0-9]/g, "");
                    setCustomIntervalText(digits);
                    const n = parseInt(digits, 10);
                    set("reminderIntervalDays", Number.isFinite(n) && n > 0 ? n : undefined);
                  }}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor={colors.textMuted}
                  maxLength={4}
                />
                <Text style={styles.customIntervalLabel}>günde bir iletişime geç</Text>
              </View>
            )}
          </View>

          {/* ── Section 5: Tags ── */}
          <SectionLabel title="Etiketler" />

          <View style={styles.card}>
            <Text style={styles.chipLabel}>Önerilen etiketler</Text>
            <View style={styles.chipRow}>
              {SUGGESTED_TAGS.map(tag => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Section 6: Notes ── */}
          <SectionLabel title="Notlar" />

          <View style={styles.card}>
            <TextInput
              style={styles.notesInput}
              value={form.notes}
              onChangeText={v => set("notes", v)}
              placeholder="İlk izlenim, ortak ilgi alanları, önemli detaylar..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.optionalToggle}
            onPress={() => setNotesOpen(p => !p)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionalToggleText}>
              {notesOpen ? "Ek bilgileri gizle" : "+ Aile, hediye ve kişisel notlar"}
            </Text>
          </TouchableOpacity>

          {notesOpen && (
            <View style={styles.card}>
              <TextInput
                style={styles.notesInput}
                placeholder="Aile bilgisi, hediye fikirleri, özel günler..."
                placeholderTextColor={colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Sticky bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 12 }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleBack} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnOff]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={!canSave}
          >
            <Text style={styles.saveBtnText}>Kişiyi Kaydet</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Discard modal */}
      <DiscardModal
        visible={discardModal}
        onKeep={() => setDiscard(false)}
        onDiscard={() => { setDiscard(false); navigation.goBack(); }}
      />

      {/* Contacts permission modal */}
      <PermissionDeniedModal
        visible={permissionModal}
        title="Rehbere erişim izni gerekli"
        description="Telefon rehberinden kişi ekleyebilmek için rehber erişimine izin vermelisin."
        onClose={() => setPermissionModal(false)}
      />

      {/* Device contact picker */}
      <DeviceContactPickerModal
        visible={pickerVisible}
        contacts={deviceContacts}
        onSelect={handlePickDeviceContact}
        onClose={() => setPickerVisible(false)}
      />

      {/* Relationship options manager */}
      <ManageOptionsModal
        visible={relationshipManagerOpen}
        title="İlişki türlerini yönet"
        customOptions={customRelationships}
        onAdd={handleAddRelationship}
        onRemove={handleRemoveRelationship}
        onClose={() => setRelationshipManagerOpen(false)}
      />
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.trim().split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toISODate(d);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionLabelText}>{title}</Text>
    </View>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function Field({
  label, required, value, error, placeholder, multiline, keyboardType, autoCapitalize, onChangeText,
}: {
  label: string; required?: boolean; value: string; error?: string;
  placeholder?: string; multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldTop}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {required && <View style={styles.requiredDot} />}
      </View>
      <TextInput
        style={[styles.fieldInput, error && styles.fieldInputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        textAlignVertical={multiline ? "top" : "center"}
        autoCapitalize={autoCapitalize ?? (keyboardType === "email-address" || keyboardType === "url" ? "none" : "words")}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function ChipSection({
  label, required, error, chips, selected, onSelect, colorMap, displayMap, onManage,
}: {
  label: string; required?: boolean; error?: string;
  chips: string[]; selected: string;
  onSelect: (v: string) => void;
  colorMap?: Record<string, string>;
  displayMap?: Record<string, string>;
  onManage?: () => void;
}) {
  const displayVal = displayMap?.[selected] ?? selected;
  return (
    <View style={styles.card}>
      <View style={styles.fieldTop}>
        <Text style={styles.chipLabel}>{label}</Text>
        {required && <View style={styles.requiredDot} />}
      </View>
      <View style={styles.chipRow}>
        {chips.map(chip => {
          const isActive = selected === chip || displayVal === chip;
          const accent = colorMap?.[chip];
          return (
            <TouchableOpacity
              key={chip}
              style={[
                styles.chip,
                isActive && (accent
                  ? { backgroundColor: accent + "18", borderColor: accent }
                  : styles.chipActive),
              ]}
              onPress={() => onSelect(chip)}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.chipText,
                isActive && (accent ? { color: accent, fontWeight: "600" } : styles.chipTextActive),
              ]}>
                {chip}
              </Text>
            </TouchableOpacity>
          );
        })}
        {onManage && (
          <TouchableOpacity
            style={styles.chipAddBtn}
            onPress={onManage}
            activeOpacity={0.75}
          >
            <Text style={styles.chipAddBtnText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function ManageOptionsModal({
  visible, title, customOptions, onAdd, onRemove, onClose,
}: {
  visible: boolean;
  title: string;
  customOptions: string[];
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalBox}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalDesc}>
            Kendi seçeneğini ekle veya daha önce eklediklerini kaldır.
          </Text>

          <View style={styles.manageInputRow}>
            <TextInput
              style={styles.manageInput}
              value={text}
              onChangeText={setText}
              placeholder="Yeni seçenek yaz..."
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.manageAddBtn, !text.trim() && styles.manageAddBtnOff]}
              onPress={handleAdd}
              activeOpacity={0.8}
              disabled={!text.trim()}
            >
              <Text style={styles.manageAddBtnText}>Ekle</Text>
            </TouchableOpacity>
          </View>

          {customOptions.length > 0 ? (
            <View style={styles.manageList}>
              {customOptions.map((opt) => (
                <View key={opt} style={styles.manageListRow}>
                  <Text style={styles.manageListText} numberOfLines={1}>{opt}</Text>
                  <TouchableOpacity
                    onPress={() => onRemove(opt)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.manageListRemove}>Kaldır</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.manageEmptyText}>Henüz özel seçenek eklemedin.</Text>
          )}

          <TouchableOpacity style={styles.modalPrimary} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.modalPrimaryText}>Kapat</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DiscardModal({ visible, onKeep, onDiscard }: {
  visible: boolean; onKeep: () => void; onDiscard: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onKeep}>
        <Pressable style={styles.modalBox}>
          <Text style={styles.modalTitle}>Değişiklikler kaybolacak</Text>
          <Text style={styles.modalDesc}>
            Kaydetmeden çıkarsan girdiğin bilgiler silinecek.
          </Text>
          <TouchableOpacity style={styles.modalPrimary} onPress={onKeep} activeOpacity={0.85}>
            <Text style={styles.modalPrimaryText}>Düzenlemeye devam et</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSecondary} onPress={onDiscard} activeOpacity={0.75}>
            <Text style={styles.modalSecondaryText}>Sil ve çık</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DeviceContactPickerModal({ visible, contacts, onSelect, onClose }: {
  visible: boolean;
  contacts: DeviceContact[];
  onSelect: (c: DeviceContact) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.pickerBox}>
          <Text style={styles.modalTitle}>Rehberden Seç</Text>
          <Text style={styles.modalDesc}>Forma aktarmak istediğin kişiyi seç.</Text>
          <FlatList
            data={contacts}
            keyExtractor={(item, i) => item.id ?? String(i)}
            style={styles.pickerList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => onSelect(item)}
                activeOpacity={0.75}
              >
                <View style={styles.pickerAvatar}>
                  <Text style={styles.pickerAvatarText}>{initials(item.name || "?")}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerRowName} numberOfLines={1}>{item.name || "İsimsiz"}</Text>
                  <Text style={styles.pickerRowSub} numberOfLines={1}>
                    {item.phone || item.email || ""}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.modalSecondary} onPress={onClose} activeOpacity={0.75}>
            <Text style={styles.modalSecondaryText}>Kapat</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Inline SVG-less Icons ─────────────────────────────────────────────────────

function ContactBookIcon() {
  return (
    <View style={{ width: 22, height: 22, justifyContent: "center", alignItems: "center" }}>
      <View style={{
        width: 16, height: 18, borderRadius: 3,
        borderWidth: 1.8, borderColor: colors.primary,
        justifyContent: "center", alignItems: "center",
      }}>
        <View style={{ width: 8, height: 1.5, backgroundColor: colors.primary, marginBottom: 2, borderRadius: 1 }} />
        <View style={{ width: 8, height: 1.5, backgroundColor: colors.primary, marginBottom: 2, borderRadius: 1 }} />
        <View style={{ width: 8, height: 1.5, backgroundColor: colors.primary, borderRadius: 1 }} />
      </View>
    </View>
  );
}

function ChevronRight() {
  return (
    <View style={{
      width: 7, height: 7,
      borderTopWidth: 1.8, borderRightWidth: 1.8,
      borderColor: colors.textMuted,
      transform: [{ rotate: "45deg" }],
      marginRight: 2,
    }} />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  // App bar
  appBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  appBarSide: { minWidth: 60 },
  appBarBack: { fontSize: 15, color: colors.primary, fontWeight: "500" },
  appBarTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  appBarSave: { fontSize: 15, color: colors.primary, fontWeight: "700", textAlign: "right" },
  appBarSaveDisabled: { color: colors.textMuted },

  // Import card
  importCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    padding: 16,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  importIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primary + "18",
    alignItems: "center", justifyContent: "center",
  },
  importTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 2 },
  importSub:   { fontSize: 12, color: colors.textSub, lineHeight: 17 },

  importedPreview: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border,
    padding: 12, marginBottom: spacing.sm,
  },
  importedAvatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.primary + "18",
    alignItems: "center", justifyContent: "center",
  },
  importedAvatarText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  importedName:  { fontSize: 14, fontWeight: "600", color: colors.text },
  importedPhone: { fontSize: 12, color: colors.textSub, marginTop: 1 },
  importedBadge: {
    marginLeft: "auto", backgroundColor: colors.primarySoft,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4,
  },
  importedBadgeText: { fontSize: 11, color: colors.primary, fontWeight: "600" },

  // Section label
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionLabelText: {
    fontSize: 11, fontWeight: "800", letterSpacing: 0.8,
    textTransform: "uppercase", color: colors.textSub,
  },

  // Card container
  card: {
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },

  // Field (grouped inside card)
  field: { paddingVertical: 4 },
  fieldTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textSub },
  requiredDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: colors.primary,
  },
  fieldInput: {
    fontSize: 15, color: colors.text,
    paddingVertical: 0, minHeight: 28,
  },
  fieldInputError: { color: colors.danger },
  fieldError: { fontSize: 11, color: colors.danger, marginTop: 4, fontWeight: "500" },

  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: 10 },

  // Chips
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.textSub, marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: { fontSize: 13, color: colors.textSub, fontWeight: "500" },
  chipTextActive: { color: colors.primary, fontWeight: "700" },
  chipAddBtn: {
    width: 34, height: 34,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center", justifyContent: "center",
  },
  chipAddBtnText: { fontSize: 17, color: colors.primary, fontWeight: "700", marginTop: -1 },

  // Custom reminder interval
  customIntervalRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 12,
  },
  customIntervalLabel: { fontSize: 13, color: colors.textSub, fontWeight: "500" },
  customIntervalInput: {
    minWidth: 56, textAlign: "center",
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.input,
    backgroundColor: colors.card, color: colors.text,
    fontSize: 14, fontWeight: "700",
    paddingVertical: 8, paddingHorizontal: 10,
  },

  // Notes
  notesInput: {
    fontSize: 14, color: colors.text,
    minHeight: 90, lineHeight: 22,
  },

  // Optional toggle
  optionalToggle: { alignSelf: "flex-start", marginBottom: spacing.sm },
  optionalToggleText: { fontSize: 13, color: colors.primary, fontWeight: "600" },

  // Bottom bar
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
    }),
  },
  cancelBtn: {
    flex: 1, height: 52, borderRadius: radius.button,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: colors.textSub },
  saveBtn: {
    flex: 2.2, height: 52, borderRadius: radius.button,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  saveBtnOff: { backgroundColor: colors.primary + "55" },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.2 },

  // Modal
  overlay: {
    flex: 1, backgroundColor: "rgba(10,8,30,0.4)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalBox: {
    width: "100%", maxWidth: 360,
    backgroundColor: colors.bg, borderRadius: radius.modal, padding: 24,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 8, textAlign: "center" },
  modalDesc:  { fontSize: 14, color: colors.textSub, textAlign: "center", lineHeight: 21, marginBottom: 24 },
  modalPrimary: {
    width: "100%", height: 50, borderRadius: radius.button,
    backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  modalPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  modalSecondary: {
    width: "100%", height: 50, borderRadius: radius.button,
    backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger + "50",
    alignItems: "center", justifyContent: "center",
  },
  modalSecondaryText: { color: colors.danger, fontWeight: "700", fontSize: 15 },

  // Manage options modal
  manageInputRow: {
    flexDirection: "row", gap: 8, width: "100%", marginBottom: 14,
  },
  manageInput: {
    flex: 1, height: 46,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.input,
    backgroundColor: colors.card, color: colors.text,
    paddingHorizontal: 14, fontSize: 14,
  },
  manageAddBtn: {
    height: 46, paddingHorizontal: 16, borderRadius: radius.input,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
  },
  manageAddBtnOff: { backgroundColor: colors.primary + "55" },
  manageAddBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  manageList: { width: "100%", marginBottom: 14 },
  manageListRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  manageListText: { flex: 1, fontSize: 14, color: colors.text, fontWeight: "500", marginRight: 12 },
  manageListRemove: { fontSize: 13, color: colors.danger, fontWeight: "700" },
  manageEmptyText: {
    fontSize: 13, color: colors.textMuted, textAlign: "center",
    marginBottom: 14,
  },

  // Device contact picker
  pickerBox: {
    width: "100%", maxWidth: 400, maxHeight: "75%",
    backgroundColor: colors.bg, borderRadius: radius.modal, padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 20,
      },
      android: { elevation: 16 },
    }),
  },
  pickerList: { marginTop: 8, marginBottom: 12 },
  pickerRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  pickerAvatar: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.primary + "18",
    alignItems: "center", justifyContent: "center",
  },
  pickerAvatarText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  pickerRowName: { fontSize: 14, fontWeight: "600", color: colors.text },
  pickerRowSub: { fontSize: 12, color: colors.textSub, marginTop: 1 },
});
