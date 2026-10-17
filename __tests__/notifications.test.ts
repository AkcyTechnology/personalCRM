import type { ContactForm } from "../src/screens/AddContactScreen";

const mockScheduled: any[] = [];
const mockN = {
  getPermissionsAsync: jest.fn(async () => ({ status: "granted", canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => { mockScheduled.length = 0; }),
  scheduleNotificationAsync: jest.fn(async (req: any) => { mockScheduled.push(req); return String(mockScheduled.length); }),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  setNotificationCategoryAsync: jest.fn(async () => {}),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: "date", WEEKLY: "weekly" },
};
jest.mock("expo-notifications", () => mockN);
jest.mock("expo", () => ({ isRunningInExpoGo: () => false }));

const contact = (extra: Partial<ContactForm>): ContactForm => ({
  fullName: "Zeynep Kaya", company: "", jobTitle: "", birthday: "", relationship: "", metWhere: "", phone: "",
  email: "", website: "", instagram: "", city: "", socials: [], tags: "", priority: "", lastContactDate: "",
  reminderFreq: "", notes: "", ...extra,
});

const settings = {
  reachOutThresholdDays: 14, userName: "", email: "", language: "tr" as const, onboardingComplete: true, goals: [],
  notif_birthday: true, notif_followUp: true, notif_weeklySummary: true, notif_smartNudge: false, appLockEnabled: false,
};

describe("syncRemindersAsync", () => {
  beforeEach(() => { jest.clearAllMocks(); mockScheduled.length = 0; });

  it("replaces all mockScheduled notifications with the current plan", async () => {
    const { syncRemindersAsync } = require("../src/utils/notifications");
    await syncRemindersAsync([contact({ id: "a", lastContactDate: "2026-01-01", birthday: "01/01/1990" })], settings);
    expect(mockN.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    const kinds = mockScheduled.map((r) => r.content.data.kind);
    expect(kinds).toEqual(expect.arrayContaining(["followUp", "birthday", "weeklySummary"]));
    const follow = mockScheduled.find((r) => r.content.data.kind === "followUp");
    expect(follow.content.categoryIdentifier).toBe("follow_up");
    expect(follow.content.data.contactId).toBe("a");
    expect(follow.trigger.type).toBe("date");
    expect(mockScheduled.find((r) => r.content.data.kind === "weeklySummary").trigger).toMatchObject({ type: "weekly", weekday: 2, hour: 9 });
  });

  it("schedules nothing without permission", async () => {
    mockN.getPermissionsAsync.mockResolvedValueOnce({ status: "denied", canAskAgain: false } as any);
    const { syncRemindersAsync } = require("../src/utils/notifications");
    await syncRemindersAsync([contact({ id: "a", lastContactDate: "2026-01-01" })], settings);
    expect(mockN.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("does not put notes or phone numbers into notification text", async () => {
    const { syncRemindersAsync } = require("../src/utils/notifications");
    await syncRemindersAsync([contact({ id: "a", lastContactDate: "2026-01-01", notes: "GIZLI-NOT", phone: "05321112233" })], settings);
    const text = JSON.stringify(mockScheduled.map((r) => r.content));
    expect(text).not.toContain("GIZLI-NOT");
    expect(text).not.toContain("05321112233");
  });
});
