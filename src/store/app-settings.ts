import { create } from "zustand";
import { STORAGE_KEYS, PLAN_SERVICES, PLAN_NAMES } from "@/lib/constants";
import type { WorkspaceMode, PlanItem } from "@/lib/constants";

export type { WorkspaceMode };

export interface NotificationEntry {
  id: string;
  date: string;
  time: string;
  message: string;
}

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
  dashboardLayout: { id: string; visible: boolean; order: number }[];
  clientsGoal: number;
  dailyGoals: Record<string, number>;
  workspaceMode: WorkspaceMode;
  notificationsLog: NotificationEntry[];
  notifLastSeenCount: number;
  servicePlans: Record<string, Record<string, PlanItem[]>>;
  selectedPlanService: string;
  selectedPlanName: string;
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
  dashboardLayout: [
    { id: "nav",          visible: true, order: 0 },
    { id: "hoy",          visible: true, order: 1 },
    { id: "anio",         visible: true, order: 2 },
    { id: "mes",          visible: true, order: 3 },
    { id: "barras",       visible: true, order: 4 },
    { id: "area_mensual", visible: true, order: 5 },
    { id: "area_anual",   visible: true, order: 6 },
  ],
  clientsGoal: 21,
  dailyGoals: {},
  workspaceMode: "ventas",
  notificationsLog: [],
  notifLastSeenCount: 0,
  servicePlans: {},
  selectedPlanService: PLAN_SERVICES[0],
  selectedPlanName: PLAN_NAMES[0],
};

export interface Toast {
  id: string;
  message: string;
}

interface AppSettingsStore {
  settings: AppSettings;
  toasts: Toast[];
  load: () => void;
  update: (patch: Partial<AppSettings>) => void;
  toggleDarkMode: () => void;
  addNotification: (message: string) => void;
  dismissToast: (id: string) => void;
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

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function nowBA(): { date: string; time: string } {
  if (typeof window === "undefined") {
    const d = new Date();
    return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
  }
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, time: `${g("hour")}:${g("minute")}` };
}

export const useAppSettings = create<AppSettingsStore>((set, get) => ({
  settings: DEFAULT_APP_SETTINGS,
  toasts: [],

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

  addNotification(message) {
    const { date, time } = nowBA();
    const entry: NotificationEntry = { id: makeId(), date, time, message };
    const settings = get().settings;
    const log = [entry, ...settings.notificationsLog].slice(0, 500);
    const updated = { ...settings, notificationsLog: log };
    set({ settings: updated });
    persist(updated);
    const toastId = makeId();
    set((s) => ({ toasts: [...s.toasts, { id: toastId, message }] }));
    setTimeout(() => get().dismissToast(toastId), 4000);
  },

  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
