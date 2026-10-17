import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { loadSettings, subscribeSettings } from "../data/userSettings";
import { authenticateAsync } from "../utils/biometrics";
import { colors } from "../theme/colors";

/** Lock again if the app stayed in the background longer than this. */
const RELOCK_AFTER_MS = 30_000;

/**
 * When the user enables the app lock, the app content is hidden behind
 * Face ID / fingerprint / device passcode on launch and after returning from
 * the background. While the app is inactive (app switcher) a privacy cover
 * hides contact data from the OS snapshot.
 */
export default function AppLock({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(false);
  const [covered, setCovered] = useState(false);
  const [busy, setBusy] = useState(false);
  const backgroundAt = useRef<number | null>(null);
  const enabledRef = useRef(false);

  const unlock = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const ok = await authenticateAsync();
    setBusy(false);
    if (ok) setLocked(false);
  }, [busy]);

  useEffect(() => {
    loadSettings().then((s) => {
      enabledRef.current = s.appLockEnabled;
      setEnabled(s.appLockEnabled);
      setLocked(s.appLockEnabled);
    });
    return subscribeSettings((s) => {
      enabledRef.current = s.appLockEnabled;
      setEnabled(s.appLockEnabled);
      if (!s.appLockEnabled) setLocked(false);
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (!enabledRef.current) return;
      if (state === "active") {
        setCovered(false);
        if (backgroundAt.current && Date.now() - backgroundAt.current > RELOCK_AFTER_MS) setLocked(true);
        backgroundAt.current = null;
      } else {
        setCovered(true);
        if (state === "background" && backgroundAt.current === null) backgroundAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, []);

  // Kilit ekranı açılınca biyometrik doğrulamayı otomatik başlat
  useEffect(() => {
    if (locked && !covered) unlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, covered]);

  if (enabled === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {children}
      {(locked || (enabled && covered)) && (
        <View style={[StyleSheet.absoluteFill, styles.cover]}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed" size={34} color={colors.primary} />
          </View>
          <Text style={styles.title}>Connectly kilitli</Text>
          <Text style={styles.sub}>Kişilerin ve notların koruma altında.</Text>
          {locked && !covered && (
            <TouchableOpacity
              style={styles.btn}
              onPress={unlock}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Kilidi aç"
            >
              <Text style={styles.btnText}>{busy ? "Doğrulanıyor…" : "Kilidi aç"}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  cover: { backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 32, zIndex: 1000 },
  iconWrap: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft,
    alignItems: "center", justifyContent: "center", marginBottom: 18,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  sub: { fontSize: 15, color: colors.textSub, marginTop: 6, textAlign: "center" },
  btn: { marginTop: 28, backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
