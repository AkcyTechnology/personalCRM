import { useCallback, useState } from "react";
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { secureGetItem, secureRemoveItem } from "../storage/secureStorage";
import { CARD_SHOW_DEFAULT, loadSettings, saveSettings, type UserSettings } from "../data/userSettings";
import { SUN_AVATAR } from "../data/avatars";
import Avatar from "../components/Avatar";
import QrCode from "../components/QrCode";
import { showToast } from "../components/Toast";
import { buildVCard, linkedinUrl, type CardInfo } from "../utils/vcard";
import { toSafeWebUrl } from "../utils/links";
import { colors } from "../theme/colors";
import { t } from "../i18n";

type IconName = keyof typeof Ionicons.glyphMap;

/** Where earlier versions kept a separate card form. Moved into the profile once. */
const LEGACY_KEY = "personal_crm_business_card_v1";

/**
 * Brings a card saved by an older version into the profile, filling only
 * what the profile doesn't have yet, then removes the old copy.
 */
async function migrateLegacyCard(s: UserSettings): Promise<UserSettings> {
  try {
    const raw = await secureGetItem(LEGACY_KEY);
    if (!raw) return s;
    const old = JSON.parse(raw) as Record<string, unknown>;
    const str = (k: string) => (typeof old[k] === "string" ? (old[k] as string).trim() : "");
    const bool = (k: string, d: boolean) => (typeof old[k] === "boolean" ? (old[k] as boolean) : d);
    const next: UserSettings = {
      ...s,
      userName: s.userName || str("fullName"),
      email: s.email || str("email"),
      phone: s.phone || str("phone"),
      title: s.title || str("title"),
      company: s.company || str("company"),
      about: s.about || str("about"),
      website: s.website || str("website"),
      linkedin: s.linkedin || str("linkedin"),
      address: s.address || str("address"),
      cardShow: s.cardShow ?? {
        ...CARD_SHOW_DEFAULT,
        phone: bool("showPhone", true),
        email: bool("showEmail", true),
        website: bool("showWebsite", true),
        linkedin: bool("showLinkedin", true),
        address: bool("showAddress", false),
      },
    };
    await saveSettings(next);
    await secureRemoveItem(LEGACY_KEY);
    return next;
  } catch {
    return s;
  }
}

/** What the card shows, honouring the "Kartvizitte göster" switches. */
function cardFrom(s: UserSettings): CardInfo {
  const show = { ...CARD_SHOW_DEFAULT, ...s.cardShow };
  return {
    fullName: s.userName?.trim() || "",
    title: s.title,
    company: s.company,
    about: s.about,
    email: show.email ? s.email : "",
    phone: show.phone ? s.phone : "",
    city: show.city ? s.city : "",
    website: show.website ? s.website : "",
    linkedin: show.linkedin ? s.linkedin : "",
    address: show.address ? s.address : "",
  };
}

function summary(c: CardInfo): string {
  return [
    c.fullName,
    [c.title, c.company].filter(Boolean).join(" · "),
    c.about ?? "",
    "",
    c.phone ? t("Telefon: {value}", { value: c.phone }) : "",
    c.email ? t("E-posta: {value}", { value: c.email }) : "",
    c.website ? t("Web sitesi: {value}", { value: c.website }) : "",
    c.linkedin ? t("LinkedIn: {value}", { value: linkedinUrl(c.linkedin) || c.linkedin }) : "",
    c.address || c.city ? t("Adres: {value}", { value: [c.address, c.city].filter(Boolean).join(", ") }) : "",
  ]
    .filter((x, i) => x || i === 3)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Dijital kartvizit: opens straight to the card. Details come from Profil
 * ayarları (nothing is asked twice); the QR holds a vCard that phones offer
 * to save as a contact.
 */
export default function BusinessCardScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then(migrateLegacyCard).then(setSettings);
    }, [])
  );

  const edit = () => navigation.navigate("ProfileSettings");

  if (!settings) return <View style={styles.screen} />;
  const card = cardFrom(settings);
  const vcard = card.fullName ? buildVCard(card) : "";
  const role = [card.title, card.company].filter(Boolean).join(" · ");

  const share = async () => {
    try {
      await Share.share({ title: t("Dijital Kartvizit"), message: summary(card) });
    } catch {
      showToast(t("Paylaşım başlatılamadı"));
    }
  };

  const all: { icon: IconName; value: string; label: string }[] = [
    { icon: "call-outline", value: card.phone ?? "", label: t("Telefon") },
    { icon: "mail-outline", value: card.email ?? "", label: t("E-posta") },
    { icon: "globe-outline", value: card.website ? (toSafeWebUrl(card.website) ?? "").replace(/^https?:\/\//, "") : "", label: t("Web sitesi") },
    { icon: "logo-linkedin", value: card.linkedin ? (linkedinUrl(card.linkedin) || "").replace(/^https?:\/\/(www\.)?/, "") : "", label: t("LinkedIn") },
    { icon: "location-outline", value: [card.address, card.city].filter(Boolean).join(", "), label: t("Adres") },
  ];
  const lines = all.filter((l) => l.value);

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t("Geri")}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} accessibilityRole="header">{t("Dijital kartvizit")}</Text>
        <TouchableOpacity style={styles.topBtn} onPress={edit} accessibilityRole="button" accessibilityLabel={t("Bilgileri düzenle")}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {!card.fullName ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Ionicons name="id-card-outline" size={34} color={colors.primary} /></View>
          <Text style={styles.emptyTitle}>{t("Kartvizitin hazır olmak üzere")}</Text>
          <Text style={styles.emptyText}>{t("Adını ve iletişim bilgilerini profiline ekle; kartvizitin ve QR kodun otomatik oluşsun.")}</Text>
          <TouchableOpacity style={styles.primary} onPress={edit} accessibilityRole="button">
            <Text style={styles.primaryText}>{t("Profil bilgilerini doldur")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* ── The card ── */}
          <LinearGradient colors={["#0B3B39", "#00706A", "#13A89C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
            <View style={styles.glowA} />
            <View style={styles.glowB} />
            <View style={styles.cardHead}>
              <View style={styles.avatarRing}>
                <Avatar name={card.fullName} avatarId={settings.userAvatarId ?? SUN_AVATAR} size={64} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={2}>{card.fullName}</Text>
                {role ? <Text style={styles.role} numberOfLines={2}>{role}</Text> : null}
              </View>
            </View>
            {card.about ? <Text style={styles.about} numberOfLines={3}>{card.about}</Text> : null}
            {lines.length > 0 ? <View style={styles.rule} /> : null}
            {lines.map((l) => (
              <View key={l.icon} style={styles.line} accessible accessibilityLabel={`${l.label}: ${l.value}`}>
                <View style={styles.lineIcon}><Ionicons name={l.icon} size={15} color="#FFFFFF" /></View>
                <Text style={styles.lineText} numberOfLines={1}>{l.value}</Text>
              </View>
            ))}
            <Text style={styles.brand}>Connectly</Text>
          </LinearGradient>

          {/* ── QR ── */}
          <TouchableOpacity style={styles.qrCard} onPress={() => setQrOpen(true)} accessibilityRole="button" accessibilityLabel={t("QR kodu büyüt")}>
            <View style={styles.qrFrame}>
              <QrCode value={vcard} size={168} accessibilityLabel={t("Kartvizit QR kodu")} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.qrTitle}>{t("QR ile paylaş")}</Text>
              <Text style={styles.qrText}>{t("Karşındaki kişi telefon kamerasıyla okuttuğunda seni rehberine kaydedebilir.")}</Text>
              <Text style={styles.qrLink}>{t("Büyütmek için dokun")}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primary} onPress={share} accessibilityRole="button">
              <Ionicons name="share-social-outline" size={18} color={colors.onFill} />
              <Text style={styles.primaryText}>{t("Paylaş")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={edit} accessibilityRole="button">
              <Ionicons name="create-outline" size={18} color={colors.text} />
              <Text style={styles.secondaryText}>{t("Düzenle")}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.note}>{t("Kartta görünen bilgileri Profil ayarları > Kartvizitte göster bölümünden seçebilirsin.")}</Text>
        </ScrollView>
      )}

      <Modal visible={qrOpen} transparent animationType="fade" onRequestClose={() => setQrOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setQrOpen(false)} accessibilityRole="button" accessibilityLabel={t("Kapat")}>
          <View style={styles.qrBig}>
            <Text style={styles.qrBigName}>{card.fullName}</Text>
            {role ? <Text style={styles.qrText}>{role}</Text> : null}
            <View style={{ marginTop: 16 }}>
              <QrCode value={vcard} size={260} accessibilityLabel={t("Kartvizit QR kodu")} />
            </View>
            <Text style={[styles.qrText, { marginTop: 14, textAlign: "center" }]}>{t("Kapatmak için dokun")}</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  topBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", fontSize: 17, lineHeight: 22, fontWeight: "600", color: colors.text },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  card: { borderRadius: 24, padding: 22, gap: 12, overflow: "hidden", minHeight: 220 },
  glowA: { position: "absolute", width: 220, height: 220, borderRadius: 110, right: -70, top: -90, backgroundColor: "rgba(255,255,255,0.10)" },
  glowB: { position: "absolute", width: 160, height: 160, borderRadius: 80, left: -60, bottom: -70, backgroundColor: "rgba(255,255,255,0.07)" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarRing: { borderRadius: 40, padding: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  name: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: "#FFFFFF" },
  role: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  about: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.9)" },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.35)", marginVertical: 2 },
  line: { flexDirection: "row", alignItems: "center", gap: 10 },
  lineIcon: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  lineText: { flex: 1, fontSize: 14, lineHeight: 20, color: "#FFFFFF" },
  brand: { alignSelf: "flex-end", fontSize: 12, fontWeight: "700", letterSpacing: 1, color: "rgba(255,255,255,0.6)", marginTop: 4 },

  qrCard: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  qrFrame: { padding: 6, borderRadius: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border },
  qrTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.text },
  qrText: { fontSize: 13, lineHeight: 18, color: colors.textSub },
  qrLink: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: colors.primary, marginTop: 2 },

  actions: { flexDirection: "row", gap: 10 },
  primary: {
    flex: 1, minHeight: 50, borderRadius: 12, backgroundColor: colors.primary,
    flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16,
  },
  primaryText: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.onFill },
  secondary: {
    flex: 1, minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16,
  },
  secondaryText: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.text },
  note: { fontSize: 12, lineHeight: 17, color: colors.textSub, textAlign: "center" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: "600", color: colors.text, textAlign: "center" },
  emptyText: { fontSize: 14, lineHeight: 20, color: colors.textSub, textAlign: "center", marginBottom: 8 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", padding: 24 },
  qrBig: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, alignItems: "center" },
  qrBigName: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: "#0F172A" },
});
