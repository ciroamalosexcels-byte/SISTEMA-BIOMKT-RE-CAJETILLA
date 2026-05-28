import type { Lead, TeamMember, ContentEvent, ManagementEvent, Plan, PlanEvent } from "@/types";

// Reads NEXT_PUBLIC_SCRIPTS_CSV from env (requires NEXT_PUBLIC_ prefix for browser access)
const ENV_API_URL = process.env.NEXT_PUBLIC_SCRIPTS_CSV ?? "";

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("ventas_biomarketing_app_settings_v2");
    if (stored) {
      try {
        const settings = JSON.parse(stored) as { apiUrl?: string };
        if (settings.apiUrl) return settings.apiUrl;
      } catch {
        // ignore
      }
    }
  }
  return ENV_API_URL;
}

export interface SheetsPayload {
  rows?: Lead[];
  team?: TeamMember[];
  contentEvents?: ContentEvent[];
  managementEvents?: ManagementEvent[];
  plans?: Plan[];
  planEvents?: PlanEvent[];
  columnWidths?: Record<string, number>;
  procedimientos?: Array<Record<string, unknown>>;
  action?: string;
  [key: string]: unknown;
}

export interface SheetsResponse {
  ok: boolean;
  rows?: Lead[];
  team?: TeamMember[];
  contentEvents?: ContentEvent[];
  managementEvents?: ManagementEvent[];
  plans?: Plan[];
  planEvents?: PlanEvent[];
  columnWidths?: Record<string, number>;
  procedimientos?: Array<Record<string, unknown>>;
  error?: string;
}

/** Fetch all data from Google Sheets */
export async function fetchFromSheets(): Promise<SheetsResponse> {
  const url = getApiUrl();
  if (!url) return { ok: false, error: "No API URL configured" };
  const res = await fetch(`${url}?t=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sheets fetch failed: ${res.status}`);
  return res.json() as Promise<SheetsResponse>;
}

/** Save data to Google Sheets */
export async function saveToSheets(payload: SheetsPayload): Promise<SheetsResponse> {
  const url = getApiUrl();
  if (!url) return { ok: false, error: "No API URL configured" };
  const res = await fetch(url, {
    method: "POST",
    // Apps Script expects text/plain with a JSON body string — not application/json
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Sheets save failed: ${res.status}`);
  return res.json() as Promise<SheetsResponse>;
}

/** Test connectivity to the Apps Script endpoint */
export async function testSheetsConnection(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
