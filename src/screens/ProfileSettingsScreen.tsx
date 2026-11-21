import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import { CARD_SHOW_DEFAULT, loadSettings, saveSettings, type CardShow } from "../data/userSettings";
import { showToast } from "../components/Toast";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import Avatar from "../components/Avatar";
import { SUN_AVATAR } from "../data/avatars";
import AvatarPicker from "../components/AvatarPicker";
import { t } from "../i18n";

type CardKey = "title" | "company" | "about" | "website" | "linkedin" | "address";
const CARD_FIELDS: { key: CardKey; label: string; placeholder: string; keyboard?: "url" | "default"; multiline?: boolean }[] = [
  { key: "title", label: "Unvan", placeholder: "Örn. Ürün Yöneticisi" },
  { key: "company", label: "Şirket", placeholder: "Şirket adı" },
  { key: "about", label: "Hakkımda", placeholder: "Kısa bir tanıtım", multiline: true },
  { key: "website", label: "Web sitesi", placeholder: "ornek.com", keyboard: "url" },
  { key: "linkedin", label: "LinkedIn", placeholder: "kullanici-adi veya profil linki", keyboard: "url" },
  { key: "address", label: "Adres", placeholder: "İş adresi" },
];
const SHOW_ROWS: { key: keyof CardShow; label: string }[] = [
  { key: "phone", label: "Telefon" },
  { key: "email", label: "E-posta" },
  { key: "city", label: "Şehir" },
  { key: "website", label: "Web sitesi" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "address", label: "Adres" },
];

export default function ProfileSettingsScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [avatarId, setAvatarId] = useState<string | undefined>(undefined);
  const [avatarOpen, setAvatarOpen] = useState(false);
  // Business card details: asked once, here, and shown on the digital card.
  const [card, setCard] = useState({ title: "", company: "", about: "", website: "", linkedin: "", address: "" });
  const [show, setShow] = useState<CardShow>(CARD_SHOW_DEFAULT);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        setName(s.userName || "");
        setEmail(s.email || "");
        setPhone(s.phone || "");
        setCity(s.city || "");
        setAvatarId(s.userAvatarId ?? SUN_AVATAR);
        setCard({
          title: s.title || "", company: s.company || "", about: s.about || "",
          website: s.website || "", linkedin: s.linkedin || "", address: s.address || "",
        });
        setShow({ ...CARD_SHOW_DEFAULT, ...s.cardShow });
      });
    }, [])
  );

  const handleSave = async () => {
    setSaving(true);
    const current = await loadSettings();
    await saveSettings({
      ...current,
      userName: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim(),
      userAvatarId: avatarId,
      title: card.title.trim(),
      company: card.company.trim(),
      about: card.about.trim(),
      website: card.website.trim(),
      linkedin: card.linkedin.trim(),
      address: card.address.trim(),
      cardShow: show,
    });
    setSaving(false);
    showToast(t("Profil bilgilerin güncellendi"));
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <AppHeader type="settings" centerTitle={t("Profil Ayarları")} onBack={() => navigation.goBack()} />
      <AvatarPicker
        visible={avatarOpen}
        value={avatarId}
        onClose={() => setAvatarOpen(false)}
        onSelect={(id) => { setAvatarOpen(false); setAvatarId(id); }}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => setAvatarOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={avatarId ? t("Avatarı değiştir") : t("Avatar seç")}
        >
          <Avatar name={name} avatarId={avatarId} size={88} />
          <Text style={styles.avatarLink}>{avatarId ? t("Avatarı değiştir") : t("Avatar seç")}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>{t("KİŞİSEL BİLGİLER")}</Text>

        <View style={styles.card}>
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>{t("Ad Soyad")}</Text>
            <TextInput
              accessibilityLabel={t("Ad Soyad")}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("Adın ve soyadın")}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={[styles.fieldWrap, styles.fieldBorderTop]}>
            <Text style={styles.fieldLabel}>{t("E-posta")}</Text>
            <TextInput
              accessibilityLabel={t("E-posta")}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t("E-posta adresin")}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.fieldWrap, styles.fieldBorderTop]}>
            <Text style={styles.fieldLabel}>{t("Telefon")}</Text>
            <TextInput
              accessibilityLabel={t("Telefon")}
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder={t("+90 5xx xxx xx xx")}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.fieldWrap, styles.fieldBorderTop]}>
            <Text style={styles.fieldLabel}>{t("Şehir")}</Text>
            <TextInput
              accessibilityLabel={t("Şehir")}
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder={t("Şehrin")}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t("Kartvizit bilgileri")}</Text>
        <View style={styles.card}>
          {CARD_FIELDS.map((f, i) => (
            <View key={f.key} style={[styles.fieldWrap, i > 0 && styles.fieldBorderTop]}>
              <Text style={styles.fieldLabel}>{t(f.label)}</Text>
              <TextInput
                accessibilityLabel={t(f.label)}
                style={[styles.input, f.multiline && styles.inputMulti]}
                value={card[f.key]}
                onChangeText={(v) => setCard((c) => ({ ...c, [f.key]: v }))}
                placeholder={t(f.placeholder)}
                placeholderTextColor={colors.textMuted}
                keyboardType={f.keyboard ?? "default"}
                autoCapitalize={f.keyboard === "url" ? "none" : "sentences"}
                multiline={f.multiline}
                maxLength={f.multiline ? 200 : 120}
              />
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{t("Kartvizitte göster")}</Text>
        <View style={styles.card}>
          {SHOW_ROWS.map((r, i) => (
            <View key={r.key} style={[styles.switchRow, i > 0 && styles.fieldBorderTop]}>
              <Text style={styles.switchLabel}>{t(r.label)}</Text>
              <Switch
                value={show[r.key]}
                onValueChange={(v) => setShow((x) => ({ ...x, [r.key]: v }))}
                trackColor={{ false: colors.border, true: colors.primary }}
                accessibilityLabel={t("Kartvizitte göster: {field}", { field: t(r.label) })}
              />
            </View>
          ))}
        </View>
        <Text style={styles.note}>{t("Ad, e-posta ve telefon yukarıdaki kişisel bilgilerden alınır; kartvizit ve QR kodu bu bilgilerle oluşur.")}</Text>

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>{saving ? t("Kaydediliyor…") : t("Kaydet")}</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: 60 },
  avatarWrap: { alignItems: "center", marginBottom: spacing.xxl, gap: 8 },
  avatarLink: { fontSize: 14, fontWeight: "700", color: colors.primary },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.onFill, fontSize: 30, fontWeight: "700" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  fieldWrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  fieldBorderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  fieldLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "500", marginBottom: 4 },
  input: { fontSize: 15, color: colors.text, fontWeight: "400" },
  inputMulti: { minHeight: 44, textAlignVertical: "top" },
  switchRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  switchLabel: { fontSize: 15, color: colors.text },
  note: { fontSize: 12, lineHeight: 17, color: colors.textSub, marginTop: -spacing.md, marginBottom: spacing.xl },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnText: { color: colors.onFill, fontSize: 15, fontWeight: "700" },
  linkRow: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
  },
  linkRowText: { color: colors.primary, fontSize: 14, fontWeight: "600" },
});
