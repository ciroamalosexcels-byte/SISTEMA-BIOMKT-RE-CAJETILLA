import { create } from "zustand";
import { STORAGE_KEYS } from "@/lib/constants";

export interface AppSettings {
  darkMode: boolean;
  dashboardLabelWidth: number;
  dashboardMemberWidth: number;
  dashboardTotalWidth: number;
  dashboardFontSize: number;
  notificationMinutesBefore: number;
  notificationTone: string;
  notificationRepeat: number;
  badgeRequirements: { wood: number; bronze: number; silver: number; gold: number };
  apiUrl: string;
  calendarId: string;
  calendarConnected: boolean;
  specialConfigUnlocked: boolean;
  clientOrderMode: boolean;
  clientOrder: string[];
  calendarViewMonth: string;
  systemScale: number;
  chartScale: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  darkMode: false,
  dashboardLabelWidth: 200,
  dashboardMemberWidth: 128,
  dashboardTotalWidth: 160,
  dashboardFontSize: 17,
  notificationMinutesBefore: 30,
  notificationTone: "classic",
  notificationRepeat: 1,
  badgeRequirements: { wood: 3, bronze: 8, silver: 12, gold: 30 },
  apiUrl: process.env.NEXT_PUBLIC_SCRIPTS_CSV ?? "",
  calendarId: "primary",
  calendarConnected: false,
  specialConfigUnlocked: false,
  clientOrderMode: false,
  clientOrder: [],
  calendarViewMonth: new Date().toISOString().slice(0, 7),
  systemScale: 1,
  chartScale: 1,
};

interface AppSettingsStore {
  settings: AppSettings;
  load: () => void;
  update: (patch: Partial<AppSettings>) => void;
  toggleDarkMode: () => void;
}

function persist(settings: AppSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.appSettings, JSON.stringify(settings));
}

function loadFromStorage(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_APP_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.appSettings);
    return raw
      ? { ...DEFAULT_APP_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
      : DEFAULT_APP_SETTINGS;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export const useAppSettings = create<AppSettingsStore>((set, get) => ({
  settings: DEFAULT_APP_SETTINGS,

  load() {
    const settings = loadFromStorage();
    set({ settings });
    if (typeof document !== "undefined") {
      document.body.classList.toggle("dark-mode", settings.darkMode);
    }
  },

  update(patch) {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    persist(next);
    if ("darkMode" in patch && typeof document !== "undefined") {
      document.body.classList.toggle("dark-mode", next.darkMode);
    }
  },

  toggleDarkMode() {
    get().update({ darkMode: !get().settings.darkMode });
  },
}));
