import trMessages from "../screens/messageSuggestions.json";
import { getLanguage } from "../i18n";

const EN_MESSAGES = [
  "Hey, it's been a while! You crossed my mind today — how are you doing?",
  "Just wanted to say hi and see how life's treating you.",
  "Coffee sometime this week or next? I'd love to catch up.",
  "Saw something today that reminded me of you. Hope you're well!",
  "How did that thing you were working on turn out? I've been curious.",
  "No agenda — just checking in. How's everything?",
  "I miss our chats. Free for a quick call this weekend?",
  "Thinking of you today. Hope this week is being kind to you.",
  "It's been too long! What's new with you?",
  "Hope you're doing great. Let's not let another month go by!",
  "Random hello from me 👋 How are things?",
  "I was just remembering that time we… made me smile. How are you?",
  "Hey! Any good news lately? I'd love to hear it.",
  "Would love to hear how you're doing — no rush to reply.",
  "Just a quick note to say I appreciate you.",
  "Lunch soon? My treat.",
  "How's the family? Send everyone my love.",
  "Long time no talk! Let's fix that.",
  "Hope work isn't too crazy. Fancy a walk and a chat sometime?",
  "Hi! I realised we haven't talked in ages. How have you been?",
  "Congrats again on your news — how's it all going?",
  "You popped into my head today. Hope all is well!",
  "Let's plan something fun soon. When are you free?",
  "Sending good vibes your way today ✨",
  "Hey, how was your weekend?",
  "Thanks for always being there. Let's catch up soon!",
  "I'd love your take on something — free for a quick chat?",
  "Hope the new month is off to a good start for you.",
  "How's the city treating you these days?",
  "Saw your post — looks amazing! How are you really doing?",
];

function dayOfYear() {
  const now = new Date();
  return Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000);
}

/** One warm message idea per day, in the app language. */
export function dailyMessage(): string {
  if (getLanguage() === "en") return EN_MESSAGES[(dayOfYear() - 1) % EN_MESSAGES.length];
  const list = trMessages as { message: string }[];
  if (!Array.isArray(list) || list.length === 0) return "Uzun zamandır konuşmadığın birine kısa ve samimi bir selam gönder.";
  return list[(dayOfYear() - 1) % list.length].message;
}
