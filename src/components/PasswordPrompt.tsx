import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme/colors";
import { MIN_PASSWORD_LENGTH } from "../data/backupCrypto";
import { t } from "../i18n";

type Options = {
  title: string;
  message: string;
  submitLabel: string;
  /** Ask twice and enforce the minimum length (when creating a password). */
  confirm?: boolean;
  /**
   * Runs while the sheet shows a spinner. Return null to close, or an error
   * message to keep the sheet open (e.g. wrong password).
   */
  onSubmit: (password: string, progress: (p: number) => void) => Promise<string | null>;
};

type Request = Options & { resolve: (ok: boolean) => void };
let open: ((r: Request) => void) | null = null;

/** Shows the password sheet. Resolves true after a successful onSubmit, false if cancelled. */
export function passwordPrompt(options: Options): Promise<boolean> {
  return new Promise((resolve) => {
    if (!open) return resolve(false);
    open({ ...options, resolve });
  });
}

/** Mount once near the root (App.tsx). */
export default function PasswordPromptHost() {
  const [req, setReq] = useState<Request | null>(null);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const againRef = useRef<TextInput>(null);

  useEffect(() => {
    open = (r) => {
      setPassword("");
      setAgain("");
      setError(null);
      setBusy(false);
      setProgress(0);
      setVisible(false);
      setReq(r);
    };
    return () => { open = null; };
  }, []);

  if (!req) return null;

  const close = (ok: boolean) => {
    req.resolve(ok);
    setReq(null);
    setPassword("");
    setAgain("");
  };

  const tooShort = !!req.confirm && password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = !!req.confirm && again.length > 0 && again !== password;
  const canSubmit = !busy && password.length > 0 && (!req.confirm || (password.length >= MIN_PASSWORD_LENGTH && again === password));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const problem = await req.onSubmit(password, (p) => setProgress(p));
      if (problem) {
        setError(problem);
        setBusy(false);
        return;
      }
      close(true);
    } catch {
      setError(t("Bir sorun oluştu. Lütfen tekrar dene."));
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => !busy && close(false)}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.icon}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.title} accessibilityRole="header">{req.title}</Text>
          <Text style={styles.message}>{req.message}</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!visible}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={req.confirm ? "new-password" : "current-password"}
              textContentType={req.confirm ? "newPassword" : "password"}
              placeholder={t("Parola")}
              placeholderTextColor={colors.placeholder}
              accessibilityLabel={t("Parola")}
              editable={!busy}
              autoFocus
              returnKeyType={req.confirm ? "next" : "done"}
              onSubmitEditing={() => (req.confirm ? againRef.current?.focus() : submit())}
            />
            <TouchableOpacity
              onPress={() => setVisible((v) => !v)}
              style={styles.eye}
              accessibilityRole="button"
              accessibilityLabel={visible ? t("Parolayı gizle") : t("Parolayı göster")}
            >
              <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textSub} />
            </TouchableOpacity>
          </View>
          {tooShort ? <Text style={styles.hint}>{t("En az {count} karakter", { count: MIN_PASSWORD_LENGTH })}</Text> : null}

          {req.confirm ? (
            <>
              <TextInput
                ref={againRef}
                style={[styles.input, styles.inputAlone]}
                value={again}
                onChangeText={setAgain}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder={t("Parolayı tekrar yaz")}
                placeholderTextColor={colors.placeholder}
                accessibilityLabel={t("Parolayı tekrar yaz")}
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              {mismatch ? <Text style={styles.hint}>{t("Parolalar aynı değil")}</Text> : null}
            </>
          ) : null}

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.primary, !canSubmit && styles.disabled]}
            onPress={submit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit, busy }}
          >
            {busy ? (
              <View style={styles.busyRow}>
                <ActivityIndicator color={colors.onFill} />
                <Text style={styles.primaryText}>{t("Hazırlanıyor… %{percent}", { percent: Math.round(progress * 100) })}</Text>
              </View>
            ) : (
              <Text style={styles.primaryText}>{req.submitLabel}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => close(false)} disabled={busy} accessibilityRole="button">
            <Text style={styles.secondaryText}>{t("Vazgeç")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 20 },
  sheet: { backgroundColor: colors.surface, borderRadius: 24, padding: 22 },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "900", color: colors.text, marginTop: 12 },
  message: { fontSize: 15, lineHeight: 21, color: colors.textSub, marginTop: 6, marginBottom: 14 },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card },
  input: { flex: 1, minHeight: 50, paddingHorizontal: 14, fontSize: 16, color: colors.text },
  inputAlone: { flex: 0, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.card, marginTop: 10 },
  eye: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 13, color: colors.warning, marginTop: 6, fontWeight: "600" },
  error: { fontSize: 14, color: colors.danger, marginTop: 10, fontWeight: "700" },
  primary: { marginTop: 18, minHeight: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.5 },
  busyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  primaryText: { color: colors.onFill, fontSize: 16, fontWeight: "800" },
  secondary: { marginTop: 6, minHeight: 46, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.textSub, fontSize: 15, fontWeight: "700" },
});
