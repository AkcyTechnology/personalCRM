import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { copyWithAutoClear } from "../utils/clipboard";
import { loadContacts, markContacted, snoozeContact, subscribeContacts } from "../data/contacts";
import LogInteractionModal from "../components/LogInteractionModal";
import { loadSettings } from "../data/userSettings";
import messageSuggestions from "./messageSuggestions.json";
import type { ContactForm } from "./AddContactScreen";
import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";
import { isDue, isSnoozed, effectiveIntervalDays } from "../utils/reminderInterval";
import { averageHealthScore } from "../utils/healthScore";
import SnoozeModal from "../components/SnoozeModal";
import HealthInfoModal from "../components/HealthInfoModal";
import MessageComposer from "../components/MessageComposer";
import { showToast } from "../components/Toast";

type DashboardFilter = "all" | "reachOut" | "upcoming" | "recent";

type DailySuggestion = {
  id: number;
  title: string;
  message: string;
  category?: string;
  tone?: string;
};

function initials(name: string) {
  return name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarColor(name: string) {
  const palette = ["#00B5AC", "#7C3AED", "#0369A1", colors.success, colors.warning];
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return palette[h % palette.length];
}

function daysSince(iso?: string): number {
  if (!iso) return 9999;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return 9999;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

function dayLabel(days: number) {
  if (days <= 0) return "Bugün";
  if (days === 1) return "Dün";
  if (days >= 9999) return "Tarih yok";
  return `${days}g önce`;
}

function contactMeta(c: ContactForm) {
  return [c.relationship, c.jobTitle, c.company].filter(Boolean).join(" · ") || "Bağlantı";
}

function suggestionFor(c: ContactForm, threshold: number) {
  const days = daysSince(c.lastContactDate);
  const name = c.fullName.split(" ")[0] || "Bu kişi";

  if (days >= threshold) return `${name} ile kısa bir check-in iyi olabilir.`;
  if (c.notes?.trim()) return "Notlarına göz atıp kişisel bir mesaj gönder.";
  if (c.company || c.jobTitle) return "İşleri nasıl gidiyor diye sıcak bir mesaj at.";
  return "Kısa ve samimi bir selam bağlantıyı güçlendirir.";
}

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

function getDailySuggestion(): DailySuggestion {
  const list = messageSuggestions as DailySuggestion[];

  if (!Array.isArray(list) || list.length === 0) {
    return {
      id: 0,
      title: "Bugünün mesaj fikri",
      message: "Uzun zamandır konuşmadığın birine kısa ve samimi bir selam gönder.",
      category: "Genel",
      tone: "Sıcak",
    };
  }

  const index = (getDayOfYear() - 1) % list.length;
  return list[index];
}

export default function HomeScreen({ navigation }: any) {
  const [contacts, setContacts] = useState<ContactForm[]>([]);
  const [threshold, setThreshold] = useState(14);
  const [userName, setUserName] = useState("");
  const [snoozeVisible, setSnoozeVisible] = useState(false);
  const [healthInfoOpen, setHealthInfoOpen] = useState(false);
  const [composerVisible, setComposerVisible] = useState(false);
  const [logVisible, setLogVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadContacts(), loadSettings()]).then(([c, s]) => {
        setContacts(c);
        setThreshold(s.reachOutThresholdDays || 14);
        setUserName(s.userName || "");
      });
      // Bildirimden "Görüştüm" gibi arka planda yapılan değişiklikler
      return subscribeContacts(setContacts);
    }, [])
  );

  const goToContact = (contact: ContactForm) => navigation.navigate("PersonDetail", { contact });
  const goToPeople = (filter: DashboardFilter = "all") =>
    navigation.navigate("People", { filter, threshold });
  const goToReminders = (filter: DashboardFilter = "all") =>
    navigation.navigate("Reminders", { filter, threshold });
  const goToAddContact = () => navigation.navigate("AddContact");
  const goToImportContacts = () => navigation.navigate("ImportContacts");

  // Business card ekranının route adı farklıysa burayı değiştir.
  const goToBusinessCard = () => navigation.navigate("BusinessCard");

  const dailySuggestion = useMemo(() => getDailySuggestion(), []);

  const dashboard = useMemo(() => {
    const active = contacts.filter((c) => !isSnoozed(c));

    const sortedOldest = [...active].sort(
      (a, b) => daysSince(b.lastContactDate) - daysSince(a.lastContactDate)
    );

    const sortedRecent = [...active].sort(
      (a, b) => daysSince(a.lastContactDate) - daysSince(b.lastContactDate)
    );

    const reachOut = sortedOldest.filter((c) => isDue(c, threshold));

    const nearThreshold = sortedOldest.filter((c) => {
      const d = daysSince(c.lastContactDate);
      const interval = effectiveIntervalDays(c, threshold);
      return d >= Math.floor(interval * 0.55) && d < interval;
    });

    const fallbackUpcoming = sortedOldest.filter(
      (c) => daysSince(c.lastContactDate) < effectiveIntervalDays(c, threshold)
    );

    const upcoming = (nearThreshold.length > 0 ? nearThreshold : fallbackUpcoming)
      .filter((c) => !reachOut.includes(c))
      .slice(0, 5);

    const recent = sortedRecent.slice(0, 5);
    const focusContact = reachOut[0] || upcoming[0] || recent[0];
    const contactedThisWeek = active.filter((c) => daysSince(c.lastContactDate) <= 7).length;

    const health = averageHealthScore(active, threshold);

    return {
      reachOut,
      upcoming,
      recent,
      focusContact,
      contactedThisWeek,
      health,
    };
  }, [contacts, threshold]);

  const handleSnoozeConfirm = useCallback(async (date: string) => {
    setSnoozeVisible(false);
    const target = dashboard.focusContact;
    if (!target) return;
    if (!target?.id) return;
    try {
      await snoozeContact(target.id, date);
      setContacts(await loadContacts());
      showToast("Hatırlatma ertelendi");
    } catch {
      showToast("Ertelenemedi. Lütfen tekrar dene.");
    }
  }, [dashboard.focusContact]);

  const handleLogInteraction = useCallback(async (type: import("./AddContactScreen").InteractionType, note: string, date: string) => {
    setLogVisible(false);
    const target = dashboard.focusContact;
    if (!target?.id) return;
    try {
      await markContacted(target.id, type, note, date);
      setContacts(await loadContacts());
      showToast(`${target.fullName.split(" ")[0]} ile görüşme kaydedildi`);
    } catch {
      showToast("Kaydedilemedi. Lütfen tekrar dene.");
    }
  }, [dashboard.focusContact]);

  if (contacts.length === 0) {
    return (
      <View style={styles.screen}>
        <HomeTopBar
          userName={userName}
          subtitle="Kişisel CRM alanını birlikte kuralım."
          onBusinessCard={goToBusinessCard}
          onReminders={() => goToReminders("all")}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.emptyCard} onPress={goToAddContact} activeOpacity={0.82}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>+</Text>
            </View>

            <Text style={styles.emptyTitle}>İlk bağlantını ekle</Text>

            <Text style={styles.emptyDesc}>
              Aile, arkadaş, iş ve okul bağlantılarını ekledikçe ana sayfan kişisel önerilerle dolacak.
            </Text>

            <View style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Kişi ekle</Text>
            </View>
          </TouchableOpacity>

          <QuickImportBlock onOpen={goToImportContacts} />

          <DailyMessageCard suggestion={dailySuggestion} empty />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <HomeTopBar
        userName={userName}
        subtitle="Bugün bağlantılarını güçlendirebilirsin."
        onBusinessCard={goToBusinessCard}
        onReminders={() => goToReminders("all")}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <View style={styles.heroKickerRow}>
                <Text style={styles.heroKicker}>İlişki Sağlığı</Text>
                <TouchableOpacity onPress={() => setHealthInfoOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.infoIcon}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.healthLine}>
                <Text style={styles.healthNumber}>{dashboard.health}</Text>
                <Text style={styles.healthTotal}>/100</Text>
              </View>
              <Text style={styles.heroDesc}>
                {dashboard.reachOut.length > 0
                  ? "Bazı bağlantıların yeniden temas bekliyor."
                  : "Bağlantıların iyi görünüyor."}
              </Text>
            </View>

            <View style={styles.progressCircle}>
              <Text style={styles.progressIcon}>◎</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <MiniStat label="Kişi toplam" value={contacts.length} />
            <MiniStat label="Bu hafta" value={dashboard.contactedThisWeek} />
            <MiniStat
              label="Bekleyen"
              value={dashboard.reachOut.length}
              danger={dashboard.reachOut.length > 0}
            />
          </View>
        </View>

        {dashboard.focusContact ? (
          <View style={styles.focusCard}>
            <View style={styles.focusTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.focusLabel}>Bugünün önceliği</Text>
                <Text style={styles.focusName} numberOfLines={1}>
                  {dashboard.focusContact.fullName}
                </Text>

                <Text style={styles.focusDate}>
                  Son görüşme:{" "}
                  <Text style={styles.focusDateStrong}>
                    {dayLabel(daysSince(dashboard.focusContact.lastContactDate))}
                  </Text>
                </Text>

                <Text style={styles.focusReason} numberOfLines={2}>
                  {suggestionFor(dashboard.focusContact, threshold)}
                </Text>
              </View>

              <View
                style={[
                  styles.focusAvatar,
                  {
                    backgroundColor: avatarColor(dashboard.focusContact.fullName) + "18",
                    borderColor: avatarColor(dashboard.focusContact.fullName) + "35",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.focusAvatarText,
                    { color: avatarColor(dashboard.focusContact.fullName) },
                  ]}
                >
                  {initials(dashboard.focusContact.fullName)}
                </Text>
              </View>
            </View>

            <View style={styles.focusActions}>
              <TouchableOpacity
                style={styles.messageButton}
                activeOpacity={0.8}
                onPress={() => setLogVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={`${dashboard.focusContact.fullName} ile görüştüm`}
              >
                <Text style={styles.messageButtonText}>Görüştüm ✓</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
                onPress={() => setComposerVisible(true)}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Mesaj hazırla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.8}
                onPress={() => setSnoozeVisible(true)}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>Ertele</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {dashboard.reachOut.length > 0 ? (
          <>
            <SectionHeader
              title={`Bugün ulaşılacak kişiler (${dashboard.reachOut.length})`}
              onPress={() => goToPeople("reachOut")}
            />

            <View style={styles.compactList}>
              {dashboard.reachOut.slice(0, 3).map((c, i) => (
                <ContactRow
                  key={`reach-${i}`}
                  contact={c}
                  rightText="Mesaj"
                  rightColor="#00B5AC"
                  subtitle={`Son görüşme: ${dayLabel(daysSince(c.lastContactDate))}`}
                  onPress={() => goToContact(c)}
                />
              ))}
            </View>
          </>
        ) : null}

        <QuickImportBlock onOpen={goToImportContacts} />

        <SectionHeader title="Yaklaşanlar" onPress={() => goToReminders("upcoming")} />

        <View style={styles.compactList}>
          {dashboard.upcoming.length > 0 ? (
            dashboard.upcoming.map((c, i) => (
              <ContactRow
                key={`upcoming-${i}`}
                contact={c}
                rightText={`${Math.max(0, effectiveIntervalDays(c, threshold) - daysSince(c.lastContactDate))}g kaldı`}
                rightColor={colors.warning}
                subtitle={contactMeta(c)}
                onPress={() => goToContact(c)}
              />
            ))
          ) : (
            <EmptyMiniCard text="Yaklaşan hatırlatma bulunmuyor." />
          )}
        </View>

        <SectionHeader title="Son görüştüklerin" onPress={() => goToPeople("recent")} />

        <View style={styles.compactList}>
          {dashboard.recent.map((c, i) => (
            <ContactRow
              key={`recent-${i}`}
              contact={c}
              rightText={dayLabel(daysSince(c.lastContactDate))}
              rightColor={colors.success}
              subtitle={contactMeta(c)}
              onPress={() => goToContact(c)}
            />
          ))}
        </View>

        <DailyMessageCard suggestion={dailySuggestion} />
      </ScrollView>

      <SnoozeModal
        visible={snoozeVisible}
        contactName={dashboard.focusContact?.fullName ?? ""}
        onCancel={() => setSnoozeVisible(false)}
        onConfirm={handleSnoozeConfirm}
      />

      <HealthInfoModal visible={healthInfoOpen} onClose={() => setHealthInfoOpen(false)} />

      <LogInteractionModal
        visible={logVisible}
        contactName={dashboard.focusContact?.fullName ?? ""}
        onClose={() => setLogVisible(false)}
        onSave={handleLogInteraction}
      />

      <MessageComposer
        visible={composerVisible}
        contact={dashboard.focusContact ?? null}
        onClose={() => setComposerVisible(false)}
      />
    </View>
  );
}

function HomeTopBar({
  userName,
  subtitle,
  onBusinessCard,
  onReminders,
}: {
  userName: string;
  subtitle: string;
  onBusinessCard: () => void;
  onReminders: () => void;
}) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarRow}>
        <View style={styles.greetingWrap}>
          <Text style={styles.greeting}>{userName ? `Merhaba, ${userName.split(" ")[0]}` : "Merhaba 👋"}</Text>
          <Text style={styles.greetingSub}>
            {subtitle.includes("Bugün") ? (
              <>
                Bugün <Text style={styles.accentText}>4 kişiyle</Text> bağlantını güçlendirebilirsin.
              </>
            ) : (
              subtitle
            )}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButtonWide}
            onPress={onBusinessCard}
            activeOpacity={0.78}
          >
            <Text style={styles.headerButtonWideText}>Kart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={onReminders}
            activeOpacity={0.78}
          >
            <View style={styles.notificationDot} />
            <Text style={styles.headerButtonIcon}>!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function DailyMessageCard({ suggestion, empty }: { suggestion: DailySuggestion; empty?: boolean }) {
  const [revealed, setRevealed] = useState(false);

  const copyMessage = async () => {
    await copyWithAutoClear(suggestion.message);
    showToast("Mesaj kopyalandı · 90 sn sonra panodan silinir");
  };

  if (empty && !revealed) {
    return (
      <View style={styles.dailyCard}>
        <View style={styles.dailyIcon}>
          <Text style={styles.dailyIconText}>i</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.dailyLabel}>Mesaj önerisi</Text>
          <Text style={styles.dailyTitle}>Mesaj önerisi hazır değil</Text>
          <Text style={styles.dailyMessage} numberOfLines={3}>
            Kişi notları veya son görüşme bilgileri ekleyerek daha iyi öneriler alabilirsin.
          </Text>
          <TouchableOpacity onPress={() => setRevealed(true)} activeOpacity={0.75}>
            <Text style={styles.dailyLinkText}>Genel mesaj öner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.dailyCard} activeOpacity={0.86} onPress={copyMessage}>
      <View style={styles.dailyIcon}>
        <Text style={styles.dailyIconText}>i</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.dailyLabel}>Mesaj önerisi</Text>
        <Text style={styles.dailyTitle}>{suggestion.title}</Text>
        <Text style={styles.dailyMessage} numberOfLines={3}>
          “{suggestion.message}”
        </Text>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function QuickImportBlock({ onOpen }: { onOpen: () => void }) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>İlişki ekle</Text>
          <Text style={styles.sectionSub}>Rehberindeki kişilerle bağlantı kur.</Text>
        </View>

        <TouchableOpacity onPress={onOpen} activeOpacity={0.75}>
          <Text style={styles.seeAll}>Rehberi tara</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.importBanner} onPress={onOpen} activeOpacity={0.82}>
        <View style={styles.importIcon}>
          <Text style={styles.importIconText}>+</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.importBannerTitle}>Rehberden kişi seç</Text>
          <Text style={styles.importBannerSub}>Telefon rehberinden hızlıca aktar.</Text>
        </View>

        <Text style={styles.importBannerArrow}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

function MiniStat({
  label,
  value,
  danger,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, danger && { color: colors.danger }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        <Text style={styles.seeAll}>Tümünü gör</Text>
      </TouchableOpacity>
    </View>
  );
}

function ContactRow({
  contact,
  subtitle,
  rightText,
  rightColor,
  onPress,
}: {
  contact: ContactForm;
  subtitle: string;
  rightText: string;
  rightColor: string;
  onPress: () => void;
}) {
  const color = avatarColor(contact.fullName);

  return (
    <TouchableOpacity style={styles.contactRow} onPress={onPress} activeOpacity={0.75}>
      <View
        style={[
          styles.avatarSmall,
          {
            backgroundColor: color + "16",
            borderColor: color + "35",
          },
        ]}
      >
        <Text style={[styles.avatarTextSmall, { color }]}>{initials(contact.fullName)}</Text>
      </View>

      <View style={styles.contactInfo}>
        <Text style={styles.contactName} numberOfLines={1}>
          {contact.fullName}
        </Text>
        <Text style={styles.contactDetail} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.tag, { backgroundColor: rightColor + "16" }]}>
        <Text style={[styles.tagText, { color: rightColor }]}>{rightText}</Text>
      </View>

      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

function EmptyMiniCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyMiniCard}>
      <Text style={styles.emptyMiniText}>{text}</Text>
    </View>
  );
}

const TOP_SAFE =
  Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 48;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  topBar: {
    paddingTop: TOP_SAFE,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EBEBF0",
  },

  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  greetingWrap: {
    flex: 1,
  },

  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.4,
  },

  greetingSub: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    fontWeight: "400",
  },

  accentText: {
    color: "#00B5AC",
    fontWeight: "600",
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },

  headerButtonIcon: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  headerButtonWide: {
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 12,
    backgroundColor: "#E6FAF8",
    borderWidth: 1,
    borderColor: "#BDEDEA",
    alignItems: "center",
    justifyContent: "center",
  },

  headerButtonWideText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#008E88",
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#00B5AC",
  },

  // ── Scroll content ──────────────────────────────────────────────────────────
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },

  // ── Hero card ───────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: { shadowColor: "#64748B", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroKicker: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  heroKickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  infoIcon: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  healthLine: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "flex-end",
  },

  healthNumber: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "700",
    color: "#00B5AC",
    letterSpacing: -1,
  },

  healthTotal: {
    fontSize: 20,
    lineHeight: 30,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  heroDesc: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: "#DDF5F3",
    alignItems: "center",
    justifyContent: "center",
  },

  progressIcon: {
    fontSize: 32,
    color: "#00B5AC",
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginVertical: 14,
  },

  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },

  miniStat: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  miniValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },

  miniLabel: {
    marginTop: 3,
    fontSize: 11,
    color: "#6B7280",
    lineHeight: 15,
    fontWeight: "500",
  },

  // ── Focus card ──────────────────────────────────────────────────────────────
  focusCard: {
    marginTop: 12,
    backgroundColor: "#F2FFFE",
    borderWidth: 1,
    borderColor: "#C4EAE8",
    borderRadius: 18,
    padding: 16,
  },

  focusTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },

  focusLabel: {
    fontSize: 11,
    color: "#00A39B",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  focusName: {
    marginTop: 5,
    fontSize: 18,
    color: "#111827",
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  focusDate: {
    marginTop: 5,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "400",
  },

  focusDateStrong: {
    color: "#00A39B",
    fontWeight: "600",
  },

  focusReason: {
    marginTop: 6,
    fontSize: 13,
    color: "#4B5565",
    lineHeight: 19,
  },

  focusAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  focusAvatarText: {
    fontSize: 18,
    fontWeight: "700",
  },

  focusActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },

  messageButton: {
    flex: 1,
    backgroundColor: "#00B5AC",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  messageButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Daily card ──────────────────────────────────────────────────────────────
  dailyCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    padding: 14,
  },

  dailyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },

  dailyIconText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7C3AED",
  },

  dailyLabel: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  dailyTitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },

  dailyMessage: {
    marginTop: 4,
    fontSize: 12,
    color: "#4B5565",
    lineHeight: 18,
  },

  dailyLinkText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED",
  },

  chevron: {
    fontSize: 22,
    color: "#9CA3AF",
    fontWeight: "300",
  },

  // ── Section header ──────────────────────────────────────────────────────────
  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },

  sectionSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },

  seeAll: {
    color: "#00A39B",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Contact list ────────────────────────────────────────────────────────────
  compactList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },

  contactRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },

  avatarSmall: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarTextSmall: {
    fontSize: 14,
    fontWeight: "700",
  },

  contactInfo: {
    flex: 1,
  },

  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  contactDetail: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },

  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },

  rowChevron: {
    fontSize: 20,
    color: "#9CA3AF",
    fontWeight: "300",
  },

  // ── Import banner ───────────────────────────────────────────────────────────
  importBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D0F0EE",
    padding: 14,
  },

  importIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#E6FAF8",
    borderWidth: 1,
    borderColor: "#BDEDEA",
    alignItems: "center",
    justifyContent: "center",
  },

  importIconText: {
    color: "#00B5AC",
    fontSize: 22,
    fontWeight: "400",
  },

  importBannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  importBannerSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },

  importBannerArrow: {
    fontSize: 22,
    color: "#9CA3AF",
    fontWeight: "300",
  },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    alignItems: "center",
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: "#64748B", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }),
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#E6FAF8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyIconText: {
    fontSize: 26,
    color: "#00B5AC",
    fontWeight: "400",
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },

  emptyDesc: {
    marginTop: 7,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  primaryButton: {
    marginTop: 16,
    backgroundColor: "#00B5AC",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  emptyMiniCard: {
    padding: 14,
    backgroundColor: "#FFFFFF",
  },

  emptyMiniText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
});