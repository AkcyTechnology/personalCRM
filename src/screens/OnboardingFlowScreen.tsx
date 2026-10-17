import { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { loadSettings, saveSettings } from "../data/userSettings";
import { colors } from "../theme/colors";
import { INTERVAL_PRESETS } from "../utils/reminderInterval";

const PURPLE = colors.primary;
const BG     = "#FAFEFE";
const CARD   = "#FFFFFF";
const BORDER = colors.border;
const TEXT   = colors.text;
const MUTED  = colors.textSub;

const TOTAL_STEPS = 3;

const PURPOSES = [
  { key: "personal",     label: "Kişisel ilişkilerimi takip etmek",         icon: "❤️" },
  { key: "professional", label: "İş bağlantılarımı takip etmek",            icon: "💼" },
  { key: "networking",   label: "Networking yapmak",                       icon: "🤝" },
  { key: "occasions",    label: "Özel günleri ve hatırlatıcıları takip etmek", icon: "🎂" },
];

const LATER = "Daha sonra ayarla";

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` as any }]} />
    </View>
  );
}

function GradientBtn({
  label, onPress, disabled,
}: {
  label: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[s.btnShadow, disabled && s.btnDisabled]}
    >
      <LinearGradient
        colors={["#4DD9CF", PURPLE]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.btn}
      >
        <Text style={s.btnText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Wrapper that centres content at max 430px on wide screens and handles safe area
function StepShell({
  step, children, insetTop, insetBottom,
}: {
  step: number;
  children: React.ReactNode;
  insetTop: number;
  insetBottom: number;
}) {
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(width, 430);

  return (
    <View style={[s.root, { overflow: "hidden" as any }]}>
      <ProgressBar step={step} />
      <View style={[s.centerer, { width }]}>
        <View style={[s.panel, { width: panelWidth, paddingTop: insetTop + 16, paddingBottom: insetBottom + 16 }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingFlowScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [step,     setStep]    = useState(0);
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [city,     setCity]     = useState("");
  const [purposes, setPurposes] = useState<string[]>([]);
  const [intervalDays, setIntervalDays] = useState<number | null>(null);

  // Responsive image height: 34% of screen height, max 240
  const imgH = Math.min(Math.round(height * 0.34), 240);

  const togglePurpose = (key: string) =>
    setPurposes(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);

  const saveBasicInfo = async () => {
    const cur = await loadSettings();
    await saveSettings({
      ...cur,
      userName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      city: city.trim(),
    });
  };

  const savePurposesAndFinish = async () => {
    const cur = await loadSettings();
    await saveSettings({
      ...cur,
      goals: purposes,
      defaultContactIntervalDays: intervalDays ?? undefined,
      onboardingComplete: true,
    });
    navigation.replace("MainTabs");
  };

  // ── Step 0: Temel bilgiler ────────────────────────────────────────────────────
  if (step === 0) {
    const valid = fullName.trim().length >= 2;
    return (
      <StepShell step={1} insetTop={insets.top} insetBottom={insets.bottom}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.flex}
        >
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={require("../../assets/onboarding5.png")}
              style={[s.img, { height: imgH }]}
              resizeMode="contain"
            />
            <Text style={s.title}>Sana nasıl{"\n"}hitap edelim?</Text>
            <Text style={s.subtitle}>Bu, deneyimini kişiselleştirmemize yardımcı olur.</Text>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Ad Soyad *</Text>
              <TextInput
                style={s.input}
                placeholder="Ad Soyad"
                placeholderTextColor={MUTED}
                value={fullName}
                onChangeText={setFullName}
                autoFocus
                returnKeyType="next"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>E-posta</Text>
              <TextInput
                style={s.input}
                placeholder="ornek@email.com"
                placeholderTextColor={MUTED}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Telefon</Text>
              <TextInput
                style={s.input}
                placeholder="+90 5xx xxx xx xx"
                placeholderTextColor={MUTED}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Şehir</Text>
              <TextInput
                style={s.input}
                placeholder="İstanbul"
                placeholderTextColor={MUTED}
                value={city}
                onChangeText={setCity}
              />
            </View>

            <GradientBtn
              label="Devam"
              onPress={async () => { await saveBasicInfo(); setStep(1); }}
              disabled={!valid}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </StepShell>
    );
  }

  // ── Step 1: Kullanım amacı ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <StepShell step={2} insetTop={insets.top} insetBottom={insets.bottom}>
        <View style={s.flex}>
          <ScrollView
            contentContainerStyle={[s.scrollContent, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[s.title, { marginTop: 8 }]}>Uygulamayı ne için{"\n"}kullanacaksın?</Text>
            <Text style={s.subtitle}>Birden fazla seçim yapabilirsin.</Text>

            <View style={s.goalsList}>
              {PURPOSES.map(p => {
                const active = purposes.includes(p.key);
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[s.goalRow, active && s.goalRowActive]}
                    onPress={() => togglePurpose(p.key)}
                    activeOpacity={0.75}
                  >
                    <View style={[s.goalIcon, active && s.goalIconActive]}>
                      <Text style={s.goalEmoji}>{p.icon}</Text>
                    </View>
                    <Text style={[s.goalLabel, active && s.goalLabelActive]}>{p.label}</Text>
                    <View style={[s.goalCheck, active && s.goalCheckActive]}>
                      {active && <Text style={s.goalCheckMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Sticky CTA — not absolute, just at the bottom of the flex column */}
          <View style={s.stickyFooter}>
            <GradientBtn
              label={
                purposes.length > 0
                  ? `Devam — ${purposes.length} seçildi`
                  : "Devam"
              }
              onPress={() => setStep(2)}
              disabled={purposes.length === 0}
            />
          </View>
        </View>
      </StepShell>
    );
  }

  // ── Step 2: Varsayılan iletişim aralığı ───────────────────────────────────────
  return (
    <StepShell step={3} insetTop={insets.top} insetBottom={insets.bottom}>
      <View style={s.flex}>
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require("../../assets/onboarding2.png")}
            style={[s.img, { height: imgH }]}
            resizeMode="contain"
          />
          <Text style={s.title}>Varsayılan iletişim{"\n"}aralığın ne olsun?</Text>
          <Text style={s.subtitle}>Yeni eklediğin kişiler için bu aralığı kullanacağız. Dilediğin zaman kişi bazında değiştirebilirsin.</Text>

          <View style={s.goalsList}>
            {INTERVAL_PRESETS.map(preset => {
              const active = intervalDays === preset.days;
              return (
                <TouchableOpacity
                  key={preset.label}
                  style={[s.goalRow, active && s.goalRowActive]}
                  onPress={() => setIntervalDays(preset.days)}
                  activeOpacity={0.75}
                >
                  <Text style={[s.goalLabel, active && s.goalLabelActive]}>{preset.label}</Text>
                  <View style={[s.goalCheck, active && s.goalCheckActive]}>
                    {active && <Text style={s.goalCheckMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[s.goalRow, intervalDays === null && s.goalRowActive]}
              onPress={() => setIntervalDays(null)}
              activeOpacity={0.75}
            >
              <Text style={[s.goalLabel, intervalDays === null && s.goalLabelActive]}>{LATER}</Text>
              <View style={[s.goalCheck, intervalDays === null && s.goalCheckActive]}>
                {intervalDays === null && <Text style={s.goalCheckMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={s.stickyFooter}>
          <GradientBtn label="Uygulamaya geç" onPress={savePurposesAndFinish} />
        </View>
      </View>
    </StepShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Shell
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },

  centerer: { flex: 1, alignItems: "center" },
  panel: { flex: 1, paddingHorizontal: 28 },

  scrollContent: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 32,
    flexGrow: 1,
  },

  // Sticky footer
  stickyFooter: {
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: BG,
  },

  // Progress bar
  progressTrack: { height: 3, backgroundColor: "#E8E4F4" },
  progressFill: { height: 3, backgroundColor: PURPLE },

  // Image — width 100% of panel, height set dynamically
  img: { width: "100%", marginBottom: 24 },

  // Text
  title: {
    fontSize: 26, fontWeight: "900", color: TEXT,
    textAlign: "center", lineHeight: 32, marginBottom: 10,
  },
  subtitle: {
    fontSize: 14, color: MUTED, textAlign: "center",
    lineHeight: 22, marginBottom: 24, maxWidth: 320,
  },

  // Input
  input: {
    width: "100%", height: 52,
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 16, fontSize: 15, color: TEXT,
  },

  // Button
  btnShadow: {
    width: "100%", borderRadius: 16,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
  },
  btnDisabled: { opacity: 0.45 },
  btn: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },

  // Goals / purpose list
  goalsList: { width: "100%", gap: 10, marginBottom: 16, marginTop: 4 },
  goalRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    padding: 14,
  },
  goalRowActive: { borderColor: PURPLE, backgroundColor: colors.primarySoft },
  goalIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#F0EDF9", alignItems: "center", justifyContent: "center",
  },
  goalIconActive: { backgroundColor: colors.primarySoft },
  goalEmoji: { fontSize: 20 },
  goalLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: TEXT },
  goalLabelActive: { color: PURPLE },
  goalCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  goalCheckActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  goalCheckMark: { color: "#FFF", fontSize: 12, fontWeight: "900" },

  // Field labels
  fieldWrap: { width: "100%", marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: MUTED, marginBottom: 6, marginLeft: 2 },
});
