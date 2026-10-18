import { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  AppState,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import AppHeader from "../components/AppHeader";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { addContacts, deleteContact as deleteContactById, deleteInteraction, getContact, updateContact } from "../data/contacts";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateField from "../components/DateField";
import LogInteractionModal, { interactionMeta } from "../components/LogInteractionModal";
import { openEmail, openPhoneCall, openWhatsApp as openWhatsAppLink, openWebUrl, socialProfileUrl } from "../utils/links";
import { ensureNotificationPermissionAsync } from "../utils/notifications";
import { loadSettings } from "../data/userSettings";
import type { ContactForm, InteractionType } from "./AddContactScreen";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { effectiveIntervalDays, intervalLabel, INTERVAL_PRESETS } from "../utils/reminderInterval";
import { healthScore as centralHealthScore, healthScoreColor } from "../utils/healthScore";
import { showToast, showUndoToast } from "../components/Toast";
import { hapticWarning } from "../utils/haptics";
import { logMoment } from "../app/momentActions";
import { locale, t, tv } from "../i18n";
import { relationshipJourney } from "../utils/engagement";
import HealthInfoModal from "../components/HealthInfoModal";
import MessageComposer from "../components/MessageComposer";
import { confirmDialog } from "../utils/confirm";

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
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysSince(iso?: string) {
  const d = parseDate(iso);
  if (!d) return null;
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(0, Math.floor((startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000));
}

function prettyDate(value?: string) {
  const d = parseDate(value);
  if (!d) return value || t("Belirtilmedi");
  return d.toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });
}

function relativeDate(value?: string) {
  const days = daysSince(value);
  if (days === null) return t("Tarih yok");
  if (days === 0) return t("Bugün");
  if (days === 1) return t("Dün");
  return t("{days} gün önce", { days });
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
  const [logOpen, setLogOpen] = useState(false);
  const [logType, setLogType] = useState<InteractionType>("other");
  const pendingAction = useRef<InteractionType | null>(null);

  useEffect(() => {
    loadSettings().then((s) => setGlobalThreshold(s.reachOutThresholdDays || 14));
    // Başka bir ekranda/bildirimde yapılan değişiklikleri yakala
    if (initialContact.id) {
      getContact(initialContact.id).then((fresh) => fresh && setContact(fresh as EditableContact));
    }
  }, [initialContact.id]);

  // Arama / WhatsApp / e-postadan dönünce "Görüştün mü?" diye sor
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && pendingAction.current) {
        setLogType(pendingAction.current);
        pendingAction.current = null;
        setTimeout(() => setLogOpen(true), 400);
      }
    });
    return () => sub.remove();
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
    const items: TimelineItem[] = [];

    if (contact.createdAt || contact.addedAt) {
      items.push({
        title: t("Kişi eklendi"),
        subtitle: prettyDate(contact.createdAt || contact.addedAt),
        icon: "person-add-outline",
        color: PURPLE,
      });
    }

    if (contact.metWhere) {
      items.push({
        title: t("Tanışma bilgisi"),
        subtitle: tv(contact.metWhere),
        icon: "location-outline",
        color: PINK,
      });
    }

    const interactions = [...(contact.interactions ?? [])].sort((a, b) => b.date.localeCompare(a.date));
    const history: TimelineItem[] = interactions.map((i) => ({
      id: i.id,
      title: interactionMeta(i.type).label,
      subtitle: `${relativeDate(i.date)} · ${prettyDate(i.date)}${i.note ? `\n${i.note}` : ""}`,
      icon: interactionMeta(i.type).icon,
      color: GREEN,
    }));

    if (contact.lastContactDate && !interactions.some((i) => i.date === contact.lastContactDate)) {
      history.push({
        title: t("Son görüşme"),
        subtitle: `${relativeDate(contact.lastContactDate)} · ${prettyDate(contact.lastContactDate)}`,
        icon: "chatbubbles-outline",
        color: GREEN,
      });
    }

    const all = [...history, ...items.reverse()];

    if (all.length === 0) {
      all.push({
        title: t("Hikâyeniz burada başlıyor"),
        subtitle: t("İlk anınızı kaydetmek için “Görüştüm”e dokun."),
        icon: "sparkles-outline",
        color: PURPLE,
      });
    }

    return all;
  }, [contact]);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openPhone = () => {
    if (!contact.phone) return;
    pendingAction.current = "call";
    openPhoneCall(contact.phone);
  };

  const openWhatsApp = () => {
    if (!contact.phone) return;
    pendingAction.current = "whatsapp";
    openWhatsAppLink(contact.phone);
  };

  const openMail = () => {
    if (!contact.email) return;
    pendingAction.current = "email";
    openEmail(contact.email);
  };

  const persist = async (patch: Partial<ContactForm>) => {
    if (!contact.id) return;
    try {
      const saved = await updateContact(contact.id, patch);
      if (saved) {
        setContact(saved as EditableContact);
        navigation.setParams({ contact: saved });
      }
      return saved;
    } catch {
      showToast(t("Kaydedilemedi. Lütfen tekrar dene."));
    }
  };

  const saveEdit = async () => {
    const lastContactDate = cleanText(form.lastContactDate) || contact.lastContactDate;
    const saved = await persist({
      fullName: cleanText(form.fullName) || contact.fullName,
      relationship: cleanText(form.relationship),
      jobTitle: cleanText(form.jobTitle),
      company: cleanText(form.company),
      phone: cleanText(form.phone),
      email: cleanText(form.email),
      birthday: cleanText(form.birthday),
      metWhere: cleanText(form.metWhere),
      lastContactDate,
      // Tarih elle değiştiyse hatırlatma aralığı oradan yeniden başlar
      reminderIntervalStart: lastContactDate !== contact.lastContactDate ? undefined : contact.reminderIntervalStart,
      tags: cleanText(form.tags),
      notes: cleanText(form.notes),
      socials: parseSocials(form.socialsText),
    });
    if (saved) {
      setIsEditing(false);
      showToast(t("Değişiklikler kaydedildi"));
    }
  };

  const saveInterval = async (days: number) => {
    await persist({ reminderIntervalDays: days, reminderEnabled: true });
    setIntervalPickerOpen(false);
    ensureNotificationPermissionAsync();
  };

  const toggleReminder = async () => {
    const enabled = contact.reminderEnabled === false;
    await persist({ reminderEnabled: enabled });
    showToast(enabled ? t("Hatırlatıcı açıldı") : t("Hatırlatıcı kapatıldı"));
    if (enabled) ensureNotificationPermissionAsync();
  };

  const logInteraction = async (type: InteractionType, note: string, date: string) => {
    setLogOpen(false);
    await logMoment(contact, type, note, date, (saved) => {
      if (!saved) return;
      setContact(saved as EditableContact);
      setForm((prev) => ({ ...prev, lastContactDate: saved.lastContactDate }));
      navigation.setParams({ contact: saved });
    });
  };

  const removeInteraction = (interactionId: string) => {
    if (!contact.id) return;
    confirmDialog(t("Görüşme kaydı silinsin mi?"), undefined, [
      { text: t("Vazgeç"), style: "cancel" },
      {
        text: t("Sil"),
        style: "destructive",
        onPress: async () => {
          const before = contact.interactions;
          const saved = await deleteInteraction(contact.id!, interactionId);
          if (!saved) return;
          setContact(saved as EditableContact);
          showUndoToast(t("Görüşme kaydı silindi"), async () => {
            const restored = await updateContact(contact.id!, { interactions: before });
            if (restored) setContact(restored as EditableContact);
          });
        },
      },
    ]);
  };

  const deleteContact = async () => {
    if (!contact.id) return;
    try {
      const snapshot: ContactForm = { ...contact };
      await deleteContactById(contact.id);
      setShowDeleteConfirm(false);
      hapticWarning();
      navigation.goBack();
      showUndoToast(t("Kişi silindi"), () => { addContacts([snapshot]); });
    } catch {
      showToast(t("Silinemedi. Lütfen tekrar dene."));
    }
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
                { label: t("Sil"), color: colors.danger, onPress: () => setShowDeleteConfirm(true) },
                { label: t("Kaydet"), color: colors.primary, onPress: saveEdit },
              ]
            : [{ label: t("Düzenle"), onPress: () => setIsEditing(true) }]
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
              <Input label={t("İsim")} value={form.fullName} onChangeText={(v) => updateField("fullName", v)} />
              <Input label={t("İlişki")} value={form.relationship} onChangeText={(v) => updateField("relationship", v)} />
              <Input label={t("Ünvan / okul")} value={form.jobTitle} onChangeText={(v) => updateField("jobTitle", v)} />
              <Input label={t("Şirket / şehir")} value={form.company} onChangeText={(v) => updateField("company", v)} />
            </View>
          ) : (
            <>
              <Text style={styles.name}>{contact.fullName}</Text>
              {contact.jobTitle || contact.company ? (
                <Text style={styles.subtitle}>{[contact.jobTitle, contact.company].filter(Boolean).join(" · ")}</Text>
              ) : null}
              {contact.relationship ? (
                <View style={styles.relationPill}>
                  <Text style={styles.relationText}>{tv(contact.relationship)}</Text>
                </View>
              ) : null}
            </>
          )}

          <View style={styles.healthMiniCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.healthLabelRow}>
                <Text style={styles.healthLabel}>{t("Bağlantın")}</Text>
                <TouchableOpacity
                  onPress={() => setHealthInfoOpen(true)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("Bağlantın nasıl hesaplanır?")}
                  >
                  <Ionicons name="information-circle-outline" size={18} color={MUTED} />
                </TouchableOpacity>
              </View>
              <Text style={styles.healthSub}>{days === null ? t("Henüz görüşme kaydı yok") : days === 0 ? t("Bugün görüşüldü") : t("{days} gündür görüşülmedi", { days })}</Text>
            </View>
            <View style={[styles.healthCircle, { borderColor: scoreColor }]}> 
              <Text style={[styles.healthScore, { color: scoreColor }]}>{score === null ? "—" : score}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Action icon="call-outline" label={t("Ara")} color={GREEN} disabled={!contact.phone} onPress={openPhone} />
            <Action icon="logo-whatsapp" label={t("WhatsApp")} color={GREEN} disabled={!contact.phone} onPress={openWhatsApp} />
            <Action icon="mail-outline" label={t("E-posta")} color={PURPLE} disabled={!contact.email} onPress={openMail} />
            <Action icon="create-outline" label={t("Mesaj")} color={ORANGE} onPress={() => setComposerVisible(true)} />
          </View>

          <TouchableOpacity
            style={styles.contactedBtn}
            onPress={() => { setLogType("other"); setLogOpen(true); }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t("{name} ile görüştüm", { name: contact.fullName })}
          >
            <Ionicons name="checkmark-circle" size={20} color={colors.white} />
            <Text style={styles.contactedText}>{t("Görüştüm")}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabsWrap}>
          <TabButton title={t("Geçmiş")} active={activeTab === "timeline"} onPress={() => setActiveTab("timeline")} />
          <TabButton title={t("Genel Bilgiler")} active={activeTab === "info"} onPress={() => setActiveTab("info")} />
        </View>

        {activeTab === "timeline" ? (
          <View>
            <JourneyStrip contact={contact} />
            <Text style={styles.sectionTitle}>{t("Hikâyeniz")}</Text>
            {(contact.interactions?.length ?? 0) > 0 ? (
              <Text style={styles.historyHint}>{t("Bir kaydı silmek için üzerine basılı tut")}</Text>
            ) : null}
            <View style={styles.timelineCard}>
              {timeline.map((item, index) => (
                <TouchableOpacity
                  key={item.id ?? `${item.title}-${index}`}
                  style={styles.timelineRow}
                  activeOpacity={item.id ? 0.7 : 1}
                  disabled={!item.id}
                  onLongPress={() => item.id && removeInteraction(item.id)}
                  accessibilityHint={item.id ? t("Silmek için basılı tut") : undefined}
                >
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, { backgroundColor: item.color }]}>
                      <Ionicons name={item.icon} size={14} color={colors.white} />
                    </View>
                    {index < timeline.length - 1 ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{item.title}</Text>
                    <Text style={styles.timelineSub}>{item.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t("Notlar")}</Text>
            {isEditing ? (
              <Input
                label={t("Not")}
                value={form.notes}
                onChangeText={(v) => updateField("notes", v)}
                multiline
                placeholder={t("Bu kişiyle ilgili hatırlamak istediğin detayları yaz...")}
              />
            ) : (
              <View style={styles.cardSoft}>
                <Text style={contact.notes ? styles.notes : styles.emptyText}>
                  {contact.notes || t("Henüz not yok")}
                </Text>
              </View>
            )}

            {isEditing ? (
              <>
                <Text style={styles.sectionTitle}>{t("Görüşme Bilgileri")}</Text>
                <DateField label={t("Son iletişim tarihi")} format="iso" value={form.lastContactDate} onChange={(v) => updateField("lastContactDate", v)} maximumDate={new Date()} />
                <Input label={t("Nerede tanıştınız?")} value={form.metWhere} onChangeText={(v) => updateField("metWhere", v)} />
              </>
            ) : null}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>{t("Kişisel Bilgiler")}</Text>
            {isEditing ? (
              <View style={styles.editBlockNoMargin}>
                <Input label={t("Telefon")} value={form.phone} onChangeText={(v) => updateField("phone", v)} keyboardType="phone-pad" />
                <Input label={t("E-posta")} value={form.email} onChangeText={(v) => updateField("email", v)} keyboardType="email-address" />
                <DateField label={t("Doğum günü")} format="birthday" value={form.birthday} onChange={(v) => updateField("birthday", v)} maximumDate={new Date()} />
                <Input label={t("Etiketler")} value={form.tags} onChangeText={(v) => updateField("tags", v)} placeholder={t("Yakın, iş, okul")} />
                <Input
                  label={t("Sosyal medya")}
                  value={form.socialsText}
                  onChangeText={(v) => updateField("socialsText", v)}
                  multiline
                  placeholder={t("Instagram: @kullanici\nLinkedIn: linkedin.com/in/...")}
                />
              </View>
            ) : (
              <View style={styles.card}>
                {contact.phone ? <InfoRow icon="call-outline" label={t("Telefon")} value={contact.phone} border onPress={openPhone} /> : null}
                {contact.email ? <InfoRow icon="mail-outline" label={t("E-posta")} value={contact.email} border={!!contact.birthday || !!contact.website} onPress={openMail} /> : null}
                {contact.website ? <InfoRow icon="globe-outline" label={t("Web sitesi")} value={contact.website} border={!!contact.birthday} onPress={() => openWebUrl(contact.website)} /> : null}
                {contact.birthday ? <InfoRow icon="gift-outline" label={t("Doğum günü")} value={contact.birthday} /> : null}
                {!contact.phone && !contact.email && !contact.birthday && !contact.website ? (
                  <Text style={styles.emptyInside}>{t("Henüz kişisel bilgi yok. Düzenle’ye basarak ekleyebilirsin.")}</Text>
                ) : null}
              </View>
            )}

            {!isEditing && contact.socials && contact.socials.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>{t("Sosyal Medya")}</Text>
                <View style={styles.card}>
                  {contact.socials.map((s, i) => {
                    const url = socialProfileUrl(s.platform, s.handle);
                    return (
                      <InfoRow
                        key={`${s.platform}-${i}`}
                        icon="link-outline"
                        label={s.platform}
                        value={s.handle}
                        border={i < (contact.socials?.length || 0) - 1}
                        onPress={url ? () => openWebUrl(url) : undefined}
                      />
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionTitle}>{t("Tanışma & İlişki")}</Text>
            <View style={styles.card}>
              {contact.relationship ? <InfoRow icon="people-outline" label={t("İlişki")} value={tv(contact.relationship)} border /> : null}
              {contact.metWhere ? <InfoRow icon="location-outline" label={t("Nerede")} value={tv(contact.metWhere)} border /> : null}
              {!contact.relationship && !contact.metWhere ? <Text style={styles.emptyInside}>{t("Tanışma bilgisi eklenmemiş.")}</Text> : null}
              <InfoRow
                icon="notifications-outline"
                label={t("İletişim aralığı")}
                value={contact.reminderEnabled === false ? t("Hatırlatıcı kapalı") : intervalLabel(interval)}
                onPress={() => setIntervalPickerOpen(true)}
              />
            </View>

            {contact.tags ? (
              <>
                <Text style={styles.sectionTitle}>{t("Etiketler")}</Text>
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
            <View style={styles.warningIcon}><Ionicons name="warning" size={24} color={colors.danger} /></View>
            <Text style={styles.confirmTitle}>{t("Bu kişiyi silmek istiyor musun?")}</Text>
            <Text style={styles.confirmDesc}>
              {t("{name} ve tüm notları, görüşme geçmişi silinecek. Hemen ardından “Geri al” diyebilirsin.", { name: contact.fullName })}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(false)} activeOpacity={0.75}>
                <Text style={styles.cancelText}>{t("Vazgeç")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerBtn} onPress={deleteContact} activeOpacity={0.75}>
                <Text style={styles.dangerText}>{t("Evet, sil")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={intervalPickerOpen} transparent animationType="fade" onRequestClose={() => setIntervalPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>{t("İletişim aralığı")}</Text>
            <Text style={styles.confirmDesc}>{t("Bu kişiyle ne sıklıkla iletişime geçmek istersin?")}</Text>
            <View style={styles.intervalOptions}>
              {INTERVAL_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[styles.intervalOption, interval === preset.days && styles.intervalOptionActive]}
                  onPress={() => saveInterval(preset.days)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.intervalOptionText, interval === preset.days && styles.intervalOptionTextActive]}>
                    {t(preset.label)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.cancelBtn, { marginBottom: 10 }]}
              onPress={async () => { await toggleReminder(); setIntervalPickerOpen(false); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.cancelText, contact.reminderEnabled !== false && { color: colors.danger }]}>
                {contact.reminderEnabled === false ? t("Hatırlatıcıyı aç") : t("Bu kişi için hatırlatıcıyı kapat")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setIntervalPickerOpen(false)} activeOpacity={0.75}>
              <Text style={styles.cancelText}>{t("Kapat")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />

      <LogInteractionModal
        visible={logOpen}
        contactName={contact.fullName}
        initialType={logType}
        onClose={() => setLogOpen(false)}
        onSave={logInteraction}
      />

      <MessageComposer
        visible={composerVisible}
        contact={contact}
        onClose={() => setComposerVisible(false)}
        onExternalSend={() => { pendingAction.current = "whatsapp"; }}
      />
    </View>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;

/** "Your story together" — a glanceable summary of the relationship. */
function JourneyStrip({ contact }: { contact: ContactForm }) {
  const j = relationshipJourney(contact);
  const since = j.since ? new Date(j.since) : null;
  const items: { icon: IconName; value: string; label: string }[] = [
    {
      icon: "calendar-outline",
      value: since ? since.toLocaleDateString(locale(), { month: "short", year: "numeric" }) : "—",
      label: t("tanışma"),
    },
    { icon: "sparkles-outline", value: String(j.moments), label: t("an") },
    { icon: "repeat-outline", value: j.averageGapDays ? t("{days}g", { days: j.averageGapDays }) : "—", label: t("ortalama ara") },
  ];
  return (
    <View style={styles.journey}>
      {items.map((it) => (
        <View key={it.label} style={styles.journeyItem} accessible accessibilityLabel={`${it.label}: ${it.value}`}>
          <Ionicons name={it.icon} size={18} color={colors.accent} />
          <Text style={styles.journeyValue}>{it.value}</Text>
          <Text style={styles.journeyLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}
type TimelineItem = { id?: string; title: string; subtitle: string; icon: IconName; color: string };

function Action({ icon, label, color, onPress, disabled }: { icon: IconName; label: string; color: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.actionItem, disabled && styles.disabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <View style={[styles.actionBox, { backgroundColor: color + "14", borderColor: color + "35" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TabButton({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({ icon, label, value, border, onPress }: { icon: IconName; label: string; value: string; border?: boolean; onPress?: () => void }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.infoRow, border && styles.rowBorder]}
      {...(onPress ? { onPress, activeOpacity: 0.7, accessibilityRole: "button" as const, accessibilityLabel: `${label}: ${value}` } : {})}
    >
      <Ionicons name={icon} size={18} color={colors.textSub} style={styles.infoIcon} />
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
        accessibilityLabel={label}
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
  journey: { flexDirection: "row", gap: 10, marginBottom: 18 },
  journeyItem: {
    flex: 1, alignItems: "center", gap: 2, paddingVertical: 12, borderRadius: 16,
    backgroundColor: colors.accentSoft,
  },
  journeyValue: { fontSize: 16, fontWeight: "900", color: colors.text },
  journeyLabel: { fontSize: 12, fontWeight: "700", color: MUTED },
  historyHint: { fontSize: 13, color: MUTED, marginTop: -6, marginBottom: 10 },
  contactedBtn: {
    width: "100%", marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14,
  },
  contactedText: { color: colors.white, fontSize: 16, fontWeight: "800" },
  actionLabel: { marginTop: 7, fontSize: 11.5, color: MUTED, fontWeight: "800", textAlign: "center" },

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
  timelineLine: { flex: 1, width: 2, backgroundColor: BORDER, marginTop: 5 },
  timelineContent: { flex: 1, paddingBottom: 18 },
  timelineTitle: { color: TEXT, fontSize: 14, fontWeight: "900" },
  timelineSub: { marginTop: 4, color: colors.textSub, fontSize: 12.5, lineHeight: 19 },

  notes: { color: colors.textSub, fontSize: 13, lineHeight: 21 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 15, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  infoIcon: { width: 28 },
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
    backgroundColor: colors.card, borderWidth: 1, borderColor: BORDER,
    alignItems: "center",
  },
  intervalOptionActive: { backgroundColor: colors.primarySoft, borderColor: PURPLE + "60" },
  intervalOptionText: { fontSize: 14, fontWeight: "600", color: TEXT },
  intervalOptionTextActive: { color: PURPLE, fontWeight: "800" },
});
