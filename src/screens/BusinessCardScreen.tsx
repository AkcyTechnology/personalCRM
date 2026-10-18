import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { secureGetItem, secureSetItem, secureRemoveItem } from "../storage/secureStorage";
import QrCode from "../components/QrCode";
import { showToast } from "../components/Toast";
import { confirmDialog } from "../utils/confirm";
import { colors } from "../theme/colors";
import { t } from "../i18n";

type BusinessCardForm = {
  fullName: string;
  title: string;
  company: string;
  about: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  linkedin: string;
  showPhone: boolean;
  showEmail: boolean;
  showWebsite: boolean;
  showLinkedin: boolean;
  showAddress: boolean;
};

const STORAGE_KEY = "personal_crm_business_card_v1";

const initialForm: BusinessCardForm = {
  fullName: "",
  title: "",
  company: "",
  about: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  linkedin: "",
  showPhone: true,
  showEmail: true,
  showWebsite: true,
  showLinkedin: true,
  showAddress: true,
};

export default function BusinessCardScreen({ navigation }: any) {
  const [mode, setMode] = useState<"view" | "edit">("edit");
  const [form, setForm] = useState<BusinessCardForm>(initialForm);
  const [hasCard, setHasCard] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    loadCard();
  }, []);

  const loadCard = async () => {
    try {
      const raw = await secureGetItem(STORAGE_KEY);

      if (!raw) {
        setMode("edit");
        return;
      }

      const saved = JSON.parse(raw) as BusinessCardForm;

      setForm({
        ...initialForm,
        ...saved,
      });

      setHasCard(Boolean(saved.fullName?.trim()));
      setMode(saved.fullName?.trim() ? "view" : "edit");
    } catch {
      setMode("edit");
    }
  };

  const updateField = useCallback((key: keyof BusinessCardForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const isValid = useMemo(() => {
    return form.fullName.trim().length > 1;
  }, [form.fullName]);

  const saveCard = async () => {
    if (!isValid) {
      showToast(t("Kartvizit için ad soyad gerekli"));
      return;
    }

    try {
      const cleaned: BusinessCardForm = {
        ...form,
        fullName: form.fullName.trim(),
        title: form.title.trim(),
        company: form.company.trim(),
        about: form.about.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        website: form.website.trim(),
        address: form.address.trim(),
        linkedin: form.linkedin.trim(),
      };

      await secureSetItem(STORAGE_KEY, JSON.stringify(cleaned));
      setForm(cleaned);
      setHasCard(true);
      setMode("view");

      showToast(t("Kartvizit kaydedildi"));
    } catch {
      showToast(t("Kartvizit kaydedilemedi. Lütfen tekrar dene."));
    }
  };

  const cardSummary = () => businessCardSummary(form);

  const shareCard = async () => {
    try {
      await Share.share({
        title: t("Dijital Kartvizit"),
        message: cardSummary(),
      });
    } catch {
      showToast(t("Paylaşım başlatılamadı"));
    }
  };

  const showQr = () => {
    setQrModalOpen(true);
    showToast(t("QR kod hazır"));
  };

  const resetCard = () => {
    confirmDialog(t("Kartviziti sıfırla"), t("Kartvizit bilgilerini temizlemek istediğine emin misin?"), [
      {
        text: t("Vazgeç"),
        style: "cancel",
      },
      {
        text: t("Sıfırla"),
        style: "destructive",
        onPress: async () => {
          await secureRemoveItem(STORAGE_KEY);
          setForm(initialForm);
          setHasCard(false);
          setMode("edit");
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>{t("Geri")}</Text>
        </TouchableOpacity>

        <Text style={styles.appTitle}>{t("Dijital Kartvizit")}</Text>

        {hasCard ? (
          <TouchableOpacity
            style={styles.topAction}
            onPress={() => setMode(mode === "view" ? "edit" : "view")}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <Text style={styles.topActionText}>{mode === "view" ? t("Düzenle") : t("Önizle")}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.topActionGhost} />
        )}
      </View>

      {mode === "view" && hasCard ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successBlock}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>✓</Text>
            </View>

            <Text style={styles.successTitle}>{t("Kartvizitin hazır")}</Text>
            <Text style={styles.successSub}>{t("Bilgilerini paylaşabilir veya dilediğin zaman düzenleyebilirsin.")}</Text>
          </View>

          <BusinessCardPreview form={form} />

          <View style={styles.quickActions}>
            <ActionButton label={t("Paylaş")} onPress={shareCard} />
            <ActionButton label={t("Düzenle")} onPress={() => setMode("edit")} variant="light" />
            <ActionButton label={t("QR Göster")} onPress={showQr} variant="light" />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>{t("Kartvizit bilgilerin senkron kalır")}</Text>
            <Text style={styles.infoText}>
              {t("Bilgilerini güncellediğinde dijital kartvizit görünümün de yenilenir.")}
            </Text>
          </View>

          <TouchableOpacity style={styles.dangerButton} onPress={resetCard} activeOpacity={0.75}>
            <Text style={styles.dangerButtonText}>{t("Kartviziti sıfırla")}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.editHero}>
            {!hasCard ? <Text style={styles.editHeroIcon}>📇</Text> : null}
            <Text style={styles.editHeroTitle}>
              {hasCard ? t("Kartvizitini düzenle") : t("Kartvizitini tamamla")}
            </Text>
            <Text style={styles.editHeroText}>
              {hasCard
                ? t("İş bilgilerini ekle, dijital kartvizitini hızlıca paylaşılabilir hale getir.") : t("Paylaşılabilir bir dijital kartvizit oluşturmak için temel bilgilerini ekle.")}
            </Text>
          </View>

          <Section title={t("Temel bilgiler")}>
            <Input
              label={t("Ad Soyad")}
              placeholder={t("Ayşe Yılmaz")}
              value={form.fullName}
              onChangeText={(v) => updateField("fullName", v)}
              required
            />

            <Input
              label={t("Unvan / Pozisyon")}
              placeholder={t("Yazılım Mühendisi")}
              value={form.title}
              onChangeText={(v) => updateField("title", v)}
            />

            <Input
              label={t("Şirket / Kurum")}
              placeholder={t("Acme A.Ş.")}
              value={form.company}
              onChangeText={(v) => updateField("company", v)}
            />

            <Input
              label={t("Hakkımda")}
              placeholder={t("Kısa bir açıklama yaz...")}
              value={form.about}
              onChangeText={(v) => updateField("about", v)}
              multiline
            />
          </Section>

          <Section title={t("İletişim bilgileri")}>
            <Input
              label={t("Telefon")}
              placeholder="+90 555 123 45 67"
              value={form.phone}
              onChangeText={(v) => updateField("phone", v)}
              keyboardType="phone-pad"
            />

            <Input
              label={t("E-posta")}
              placeholder={t("ornek@mail.com")}
              value={form.email}
              onChangeText={(v) => updateField("email", v)}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label={t("Web sitesi")}
              placeholder={"www.site.com"}
              value={form.website}
              onChangeText={(v) => updateField("website", v)}
              autoCapitalize="none"
            />

            <Input
              label={t("LinkedIn")}
              placeholder={t("linkedin.com/in/kullanici")}
              value={form.linkedin}
              onChangeText={(v) => updateField("linkedin", v)}
              autoCapitalize="none"
            />

            <Input
              label={t("Adres")}
              placeholder={t("İlçe, İl, Ülke")}
              value={form.address}
              onChangeText={(v) => updateField("address", v)}
              multiline
            />
          </Section>

          <Section title={t("Görünürlük")}>
            <VisibilityRow
              label={t("Telefonu göster")}
              value={form.showPhone}
              onChange={(v) => setForm((prev) => ({ ...prev, showPhone: v }))}
            />
            <VisibilityRow
              label={t("E-postayı göster")}
              value={form.showEmail}
              onChange={(v) => setForm((prev) => ({ ...prev, showEmail: v }))}
            />
            <VisibilityRow
              label={t("Web sitesini göster")}
              value={form.showWebsite}
              onChange={(v) => setForm((prev) => ({ ...prev, showWebsite: v }))}
            />
            <VisibilityRow
              label={t("LinkedIn göster")}
              value={form.showLinkedin}
              onChange={(v) => setForm((prev) => ({ ...prev, showLinkedin: v }))}
            />
            <VisibilityRow
              label={t("Adres göster")}
              value={form.showAddress}
              onChange={(v) => setForm((prev) => ({ ...prev, showAddress: v }))}
            />
          </Section>

          <View style={styles.previewMiniCard}>
            <Text style={styles.previewMiniLabel}>{t("Canlı önizleme")}</Text>
            <Text style={styles.previewMiniName}>{form.fullName || t("Ad Soyad")}</Text>
            <Text style={styles.previewMiniText}>
              {[form.title, form.company].filter(Boolean).join(" · ") || t("Unvan · Şirket")}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
            onPress={saveCard}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {hasCard ? t("Değişiklikleri kaydet") : t("Kartviziti oluştur")}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={qrModalOpen} transparent animationType="fade" onRequestClose={() => setQrModalOpen(false)}>
        <Pressable style={styles.qrModalOverlay} onPress={() => setQrModalOpen(false)}>
          <Pressable style={styles.qrModalBox}>
            <Text style={styles.qrModalTitle}>{form.fullName || t("Kartvizit")}</Text>
            <Text style={styles.qrModalSub}>{t("Bu QR kodu okutarak kartvizit bilgilerine ulaşabilirsin.")}</Text>
            <View style={styles.qrModalCodeWrap}>
              <QrCode value={businessCardVCard(form)} size={220} accessibilityLabel={t("Kartvizit QR kodu. Okutulunca kişi rehbere eklenir.")} />
            </View>
            <TouchableOpacity style={styles.qrModalClose} onPress={() => setQrModalOpen(false)} activeOpacity={0.75} accessibilityRole="button">
              <Text style={styles.qrModalCloseText}>{t("Kapat")}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function vcardEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** vCard 3.0 payload so scanning the QR offers to save the contact. */
function businessCardVCard(form: BusinessCardForm) {
  const parts = form.fullName.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop()! : "";
  const first = parts.join(" ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${vcardEscape(last)};${vcardEscape(first)};;;`,
    `FN:${vcardEscape(form.fullName.trim())}`,
    form.company ? `ORG:${vcardEscape(form.company)}` : "",
    form.title ? `TITLE:${vcardEscape(form.title)}` : "",
    form.showPhone && form.phone ? `TEL;TYPE=CELL:${form.phone.replace(/[^\d+]/g, "")}` : "",
    form.showEmail && form.email ? `EMAIL:${vcardEscape(form.email)}` : "",
    form.showWebsite && form.website ? `URL:${vcardEscape(form.website)}` : "",
    form.showLinkedin && form.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${vcardEscape(form.linkedin)}` : "",
    form.showAddress && form.address ? `ADR:;;${vcardEscape(form.address)};;;;` : "",
    form.about ? `NOTE:${vcardEscape(form.about)}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

function businessCardSummary(form: BusinessCardForm) {
  return [
    form.fullName,
    form.title || "",
    form.company || "",
    "",
    form.showPhone && form.phone ? t("Telefon: {value}", { value: form.phone }) : "",
    form.showEmail && form.email ? t("E-posta: {value}", { value: form.email }) : "",
    form.showWebsite && form.website ? t("Web sitesi: {value}", { value: form.website }) : "",
    form.showLinkedin && form.linkedin ? t("LinkedIn: {value}", { value: form.linkedin }) : "",
    form.showAddress && form.address ? t("Adres: {value}", { value: form.address }) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function BusinessCardPreview({ form }: { form: BusinessCardForm }) {
  const displayTitle = [form.title, form.company].filter(Boolean).join(" · ");

  return (
    <View style={styles.cardPreview}>
      <View style={styles.cardTopAccent} />

      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardName} numberOfLines={1}>
            {form.fullName}
          </Text>

          {displayTitle ? (
            <Text style={styles.cardTitle} numberOfLines={2}>
              {displayTitle}
            </Text>
          ) : null}

          {form.about ? (
            <Text style={styles.cardAbout} numberOfLines={3}>
              {form.about}
            </Text>
          ) : null}

          <View style={styles.cardDivider} />

          <CardLine label={t("E-posta")} value={form.showEmail ? form.email : ""} />
          <CardLine label={t("Telefon")} value={form.showPhone ? form.phone : ""} />
          <CardLine label={t("Web sitesi")} value={form.showWebsite ? form.website : ""} />
          <CardLine label={t("LinkedIn")} value={form.showLinkedin ? form.linkedin : ""} />
          <CardLine label={t("Adres")} value={form.showAddress ? form.address : ""} />
        </View>

        <View style={styles.cardRight}>
          <View style={styles.profileCircle}>
            <Text style={styles.profileCircleText}>{getInitials(form.fullName)}</Text>
          </View>

          <View style={styles.qrBox}>
            <QrCode value={businessCardVCard(form)} size={66} accessibilityLabel={t("Kartvizit QR kodu")} />
          </View>

          <Text style={styles.qrText}>{t("QR Kart")}</Text>
        </View>
      </View>
    </View>
  );
}

function CardLine({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;

  return (
    <View style={styles.cardLine}>
      <Text style={styles.cardLineLabel}>{label}</Text>
      <Text style={styles.cardLineValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "light";
}) {
  return (
    <TouchableOpacity
      style={[styles.actionButton, variant === "light" && styles.actionButtonLight]}
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
    >
      <Text
        style={[
          styles.actionButtonText,
          variant === "light" && styles.actionButtonTextLight,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>
        <View style={styles.sectionLine} />
      </View>

      {children}
    </View>
  );
}

function Input({
  label,
  placeholder,
  value,
  onChangeText,
  required,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {required ? (
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>{t("Zorunlu")}</Text>
          </View>
        ) : null}
      </View>

      <TextInput
        accessibilityLabel={required ? t("{label}, zorunlu", { label }) : label}
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType || "default"}
        autoCapitalize={autoCapitalize || "sentences"}
      />
    </View>
  );
}

function VisibilityRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.visibilityRow}>
      <Text style={styles.visibilityLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.primary + "88" }}
        thumbColor={value ? colors.primary : colors.white}
      />
    </View>
  );
}

function getInitials(name: string) {
  const clean = name.trim();

  if (!clean) return "K";

  return clean
    .split(" ")
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

const TOP_SAFE =
  Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 10 : 54;

const TEAL = colors.primary;
const TEAL_DARK = colors.primaryDark;
const TEXT = colors.text;
const SUB = colors.textSub;
const BORDER = colors.borderLight;
const SOFT = colors.card;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },

  appBar: {
    paddingTop: TOP_SAFE,
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    minWidth: 64,
    height: 36,
    justifyContent: "center",
  },

  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: TEAL_DARK,
  },

  appTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: TEXT,
  },

  topAction: {
    minWidth: 64,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  topActionText: {
    color: TEAL_DARK,
    fontSize: 13,
    fontWeight: "700",
  },

  topActionGhost: {
    minWidth: 64,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 110,
  },

  successBlock: {
    alignItems: "center",
    marginBottom: 18,
  },

  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  successIconText: {
    color: TEAL_DARK,
    fontSize: 30,
    fontWeight: "700",
  },

  successTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.4,
  },

  successSub: {
    marginTop: 7,
    maxWidth: 300,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
    color: SUB,
  },

  cardPreview: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
    shadowColor: colors.textSub,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  cardTopAccent: {
    height: 8,
    backgroundColor: TEAL,
  },

  cardContent: {
    flexDirection: "row",
    padding: 18,
    gap: 16,
  },

  cardLeft: {
    flex: 1,
  },

  cardName: {
    fontSize: 25,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.6,
  },

  cardTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "600",
    color: TEAL_DARK,
    lineHeight: 21,
  },

  cardAbout: {
    marginTop: 10,
    fontSize: 12.5,
    color: SUB,
    lineHeight: 18,
  },

  cardDivider: {
    width: 34,
    height: 3,
    borderRadius: 2,
    backgroundColor: TEAL,
    marginTop: 14,
    marginBottom: 12,
  },

  cardLine: {
    marginTop: 9,
  },

  cardLineLabel: {
    fontSize: 11.5,
    color: "#8A93A5",
    fontWeight: "600",
  },

  cardLineValue: {
    marginTop: 2,
    fontSize: 12.5,
    color: TEXT,
    lineHeight: 17,
    fontWeight: "500",
  },

  cardRight: {
    width: 96,
    alignItems: "center",
  },

  profileCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  profileCircleText: {
    fontSize: 23,
    color: TEAL_DARK,
    fontWeight: "700",
  },

  qrBox: {
    marginTop: 18,
    width: 82,
    height: 82,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: colors.white,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  qrText: {
    marginTop: 8,
    fontSize: 11,
    color: SUB,
    fontWeight: "600",
  },

  qrModalOverlay: {
    flex: 1, backgroundColor: "rgba(10,8,30,0.5)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  qrModalBox: {
    width: "100%", maxWidth: 340,
    backgroundColor: colors.white, borderRadius: 24, padding: 24,
    alignItems: "center",
  },
  qrModalTitle: { fontSize: 17, fontWeight: "700", color: TEXT, textAlign: "center" },
  qrModalSub: { marginTop: 6, fontSize: 13, color: SUB, textAlign: "center", lineHeight: 19 },
  qrModalCodeWrap: {
    marginTop: 20, padding: 16,
    borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    backgroundColor: colors.white,
  },
  qrModalClose: {
    marginTop: 20, width: "100%", height: 48,
    borderRadius: 14, backgroundColor: colors.borderLight,
    alignItems: "center", justifyContent: "center",
  },
  qrModalCloseText: { fontSize: 14, fontWeight: "700", color: TEXT },

  quickActions: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },

  actionButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },

  actionButtonLight: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: BORDER,
  },

  actionButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "700",
  },

  actionButtonTextLight: {
    color: TEXT,
  },

  infoCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: TEAL_DARK,
  },

  infoText: {
    marginTop: 5,
    fontSize: 12.5,
    color: SUB,
    lineHeight: 18,
  },

  dangerButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },

  dangerButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },

  editHero: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },

  editHeroIcon: {
    fontSize: 30,
    marginBottom: 8,
  },

  editHeroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.4,
  },

  editHeroText: {
    marginTop: 7,
    fontSize: 13,
    color: SUB,
    lineHeight: 20,
  },

  photoRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  mediaBox: {
    flex: 1,
    minHeight: 126,
    borderRadius: 18,
    backgroundColor: SOFT,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },

  mediaIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  mediaIconText: {
    fontSize: 24,
    color: TEAL,
    fontWeight: "500",
  },

  mediaTitle: {
    fontSize: 14,
    color: TEXT,
    fontWeight: "700",
  },

  mediaSub: {
    marginTop: 4,
    fontSize: 12,
    color: SUB,
  },

  section: {
    marginTop: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },

  sectionTitle: {
    fontSize: 12,
    color: TEAL_DARK,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },

  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },

  inputWrap: {
    marginBottom: 14,
  },

  visibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  visibilityLabel: { fontSize: 13, color: colors.textSub, fontWeight: "600" },

  inputLabelRow: {
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  inputLabel: {
    fontSize: 13,
    color: colors.textSub,
    fontWeight: "600",
  },

  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },

  requiredText: {
    fontSize: 11,
    color: TEAL_DARK,
    fontWeight: "700",
  },

  input: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 14,
    color: TEXT,
  },

  inputMultiline: {
    minHeight: 92,
    paddingTop: 13,
    textAlignVertical: "top",
  },

  previewMiniCard: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: colors.white,
    padding: 16,
  },

  previewMiniLabel: {
    fontSize: 12,
    color: TEAL_DARK,
    fontWeight: "700",
  },

  previewMiniName: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
  },

  previewMiniText: {
    marginTop: 4,
    fontSize: 13,
    color: SUB,
  },

  saveButton: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },

  saveButtonDisabled: {
    opacity: 0.55,
  },

  saveButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});