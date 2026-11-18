import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import { loadSettings, saveSettings } from "../data/userSettings";
import { showToast } from "../components/Toast";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import Avatar from "../components/Avatar";
import { SUN_AVATAR } from "../data/avatars";
import AvatarPicker from "../components/AvatarPicker";
import { t } from "../i18n";

export default function ProfileSettingsScreen({ navigation }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [avatarId, setAvatarId] = useState<string | undefined>(undefined);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => {
        setName(s.userName || "");
        setEmail(s.email || "");
        setPhone(s.phone || "");
        setCity(s.city || "");
        setAvatarId(s.userAvatarId ?? SUN_AVATAR);
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
