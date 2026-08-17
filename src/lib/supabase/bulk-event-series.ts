import { createHash } from "node:crypto";
import {
  MAX_BULK_EVENT_REPEAT_COUNT,
  planFutureOccurrences,
  planMaterializationOccurrences,
} from "@/lib/bulk-events";
import type { createAdminClient } from "@/lib/supabase/admin";
import type {
  BulkEventKind,
  BulkEventSeries,
  BulkEventSeriesInput,
  ContentType,
  ManagementType,
} from "@/types/content-event";
import type {
  BulkEventSeriesInsert,
  BulkEventSeriesRow,
  Json,
  TablesInsert,
} from "@/types/supabase";

type AdminClient = ReturnType<typeof createAdminClient>;

const CONTENT_TYPES: ContentType[] = ["CARRUSEL", "REEL", "PLACA", "HISTORIA"];
const MANAGEMENT_TYPES: ManagementType[] = [
  "Acompañamiento",
  "Llamada",
  "Visita",
  "Cobro",
  "Reunión",
  "Producción",
  "Pago",
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export class BulkEventSeriesValidationError extends Error {}
export class BulkEventSeriesConflictError extends Error {}

export interface BulkEventRowsPayload {
  contentRows: TablesInsert<"content_events">[];
  managementRows: TablesInsert<"management_events">[];
}

export interface BulkEventFutureIds {
  contentIds: string[];
  managementIds: string[];
}

export function adaptBulkEventSeriesRow(row: BulkEventSeriesRow): BulkEventSeries {
  return {
    id: row.id,
    kind: row.kind as BulkEventKind,
    title: row.title,
    type: row.event_type as ContentType | ManagementType,
    clientIds: row.client_ids,
    dayOfMonth: row.day_of_month,
    time: row.event_time,
    startMonth: row.start_month,
    recurrence: row.recurrence as BulkEventSeries["recurrence"],
    repeatCount: row.repeat_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeBulkEventSeriesInput(
  input: BulkEventSeriesInput,
): Omit<BulkEventSeriesInsert, "id" | "created_at" | "updated_at"> {
  return {
    kind: input.kind,
    title: input.title,
    event_type: input.type,
    client_ids: input.clientIds,
    day_of_month: input.dayOfMonth,
    event_time: input.time,
    start_month: input.startMonth,
    recurrence: input.recurrence,
    repeat_count: input.repeatCount,
  };
}

export function parseBulkEventSeriesInput(value: unknown): BulkEventSeriesInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BulkEventSeriesValidationError("El cuerpo debe ser un objeto");
  }

  const input = value as Record<string, unknown>;
  const kind = input.kind;
  if (kind !== "content" && kind !== "management") {
    throw new BulkEventSeriesValidationError("kind debe ser content o management");
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) throw new BulkEventSeriesValidationError("title es obligatorio");

  const type = input.type;
  const validType = typeof type === "string" && (kind === "content"
    ? CONTENT_TYPES.includes(type as ContentType)
    : MANAGEMENT_TYPES.includes(type as ManagementType));
  if (!validType) {
    throw new BulkEventSeriesValidationError(`type no es válido para ${kind}`);
  }

  if (!Array.isArray(input.clientIds) || input.clientIds.length === 0) {
    throw new BulkEventSeriesValidationError("clientIds debe contener al menos un cliente");
  }
  if (!input.clientIds.every((id) => typeof id === "string" && UUID_RE.test(id))) {
    throw new BulkEventSeriesValidationError("Todos los clientIds deben ser UUID válidos");
  }
  const clientIds = [...new Set(input.clientIds as string[])];

  const dayOfMonth = input.dayOfMonth;
  if (!Number.isInteger(dayOfMonth) || (dayOfMonth as number) < 1 || (dayOfMonth as number) > 31) {
    throw new BulkEventSeriesValidationError("dayOfMonth debe ser un entero entre 1 y 31");
  }

  const time = input.time;
  if (typeof time !== "string" || (time !== "" && !TIME_RE.test(time))) {
    throw new BulkEventSeriesValidationError("time debe estar vacío o usar HH:mm");
  }

  const startMonth = input.startMonth;
  if (typeof startMonth !== "string" || !MONTH_RE.test(startMonth)) {
    throw new BulkEventSeriesValidationError("startMonth debe usar YYYY-MM");
  }

  const recurrence = input.recurrence;
  if (recurrence !== "once" && recurrence !== "count" && recurrence !== "monthly") {
    throw new BulkEventSeriesValidationError("recurrence debe ser once, count o monthly");
  }

  const repeatCount = input.repeatCount;
  if (
    !Number.isInteger(repeatCount)
    || (repeatCount as number) < 0
    || (repeatCount as number) > MAX_BULK_EVENT_REPEAT_COUNT
  ) {
    throw new BulkEventSeriesValidationError(
      `repeatCount debe ser un entero entre 0 y ${MAX_BULK_EVENT_REPEAT_COUNT}`,
    );
  }
  if (recurrence !== "count" && repeatCount !== 0) {
    throw new BulkEventSeriesValidationError("repeatCount debe ser 0 salvo para count");
  }
  if (recurrence === "count" && repeatCount === 0) {
    throw new BulkEventSeriesValidationError("repeatCount debe ser al menos 1 para count");
  }

  return {
    kind,
    title,
    type: type as ContentType | ManagementType,
    clientIds,
    dayOfMonth: dayOfMonth as number,
    time,
    startMonth,
    recurrence,
    repeatCount: repeatCount as number,
  };
}

export function deterministicOccurrenceId(
  seriesId: string,
  kind: BulkEventKind,
  clientId: string,
  month: string,
): string {
  if (!UUID_RE.test(seriesId)) throw new RangeError("Series ID must be a UUID");

  const namespace = Buffer.from(seriesId.replaceAll("-", ""), "hex");
  const bytes = createHash("sha1")
    .update(namespace)
    .update(JSON.stringify([kind, clientId, month]))
    .digest()
    .subarray(0, 16);

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function rpcJson(value: object): Json {
  return value as Json;
}

function throwRpcError(action: string, error: { code?: string; message: string }): never {
  if (error.code === "40001" || error.message.includes("BULK_EVENT_SERIES_CONFLICT")) {
    throw new BulkEventSeriesConflictError("La serie cambió mientras se procesaba la solicitud");
  }
  throw new Error(`${action}: ${error.message}`);
}

export function buildBulkEventRows(
  series: BulkEventSeries,
  today: string,
  scope: "materialization" | "future" = "materialization",
): BulkEventRowsPayload {
  const occurrences = scope === "future"
    ? planFutureOccurrences(series, today)
    : planMaterializationOccurrences(series, today.slice(0, 7));

  if (series.kind === "content") {
    return {
      contentRows: occurrences.flatMap((occurrence) =>
        series.clientIds.map((clientId) => ({
          id: deterministicOccurrenceId(series.id, series.kind, clientId, occurrence.month),
          client_id: clientId,
          title: series.title,
          type: series.type,
          status: "SIN EDITAR",
          scheduled_date: `${occurrence.date}T${series.time || "00:00"}`,
          done: false,
          timer_seconds: 0,
          timer_running: false,
          timer_started_at: null,
          event_order: 0,
        })),
      ),
      managementRows: [],
    };
  }

  return {
    contentRows: [],
    managementRows: occurrences.flatMap((occurrence) =>
      series.clientIds.map((clientId) => ({
        id: deterministicOccurrenceId(series.id, series.kind, clientId, occurrence.month),
        client_id: clientId,
        title: series.title,
        type: series.type,
        datetime: series.time ? `${occurrence.date}T${series.time}` : occurrence.date,
        done: false,
      })),
    ),
  };
}

export function buildFutureOccurrenceIds(
  series: BulkEventSeries,
  today: string,
): BulkEventFutureIds {
  const ids = planFutureOccurrences(series, today).flatMap((occurrence) =>
    series.clientIds.map((clientId) =>
      deterministicOccurrenceId(series.id, series.kind, clientId, occurrence.month),
    ),
  );

  return series.kind === "content"
    ? { contentIds: ids, managementIds: [] }
    : { contentIds: [], managementIds: ids };
}

export async function materializeBulkEventSeries(
  admin: AdminClient,
  series: BulkEventSeries,
  today: string,
): Promise<boolean> {
  const rows = buildBulkEventRows(series, today);
  const { data, error } = await admin.rpc("materialize_bulk_event_series", {
    p_id: series.id,
    p_expected_updated_at: series.updatedAt,
    p_content_rows: rpcJson(rows.contentRows),
    p_management_rows: rpcJson(rows.managementRows),
  });
  if (error) throwRpcError("No se pudieron materializar los eventos", error);
  return data;
}

export async function createBulkEventSeries(
  admin: AdminClient,
  id: string,
  input: BulkEventSeriesInput,
  today: string,
): Promise<BulkEventSeries> {
  const pendingSeries: BulkEventSeries = {
    id,
    ...input,
    createdAt: "",
    updatedAt: "",
  };
  const rows = buildBulkEventRows(pendingSeries, today);
  const { data, error } = await admin.rpc("create_bulk_event_series", {
    p_series: rpcJson({ id, ...serializeBulkEventSeriesInput(input) }),
    p_content_rows: rpcJson(rows.contentRows),
    p_management_rows: rpcJson(rows.managementRows),
  });
  if (error) throwRpcError("No se pudo crear la serie", error);
  return adaptBulkEventSeriesRow(data);
}

export async function updateBulkEventSeries(
  admin: AdminClient,
  oldSeries: BulkEventSeries,
  input: BulkEventSeriesInput,
  today: string,
): Promise<BulkEventSeries> {
  const replacement: BulkEventSeries = { ...oldSeries, ...input };
  const rows = buildBulkEventRows(replacement, today, "future");
  const oldIds = buildFutureOccurrenceIds(oldSeries, today);
  const { data, error } = await admin.rpc("update_bulk_event_series", {
    p_id: oldSeries.id,
    p_expected_updated_at: oldSeries.updatedAt,
    p_series: rpcJson(serializeBulkEventSeriesInput(input)),
    p_old_content_ids: oldIds.contentIds,
    p_old_management_ids: oldIds.managementIds,
    p_today: today,
    p_content_rows: rpcJson(rows.contentRows),
    p_management_rows: rpcJson(rows.managementRows),
  });
  if (error) throwRpcError("No se pudo actualizar la serie", error);
  return adaptBulkEventSeriesRow(data);
}

export async function deleteBulkEventSeries(
  admin: AdminClient,
  series: BulkEventSeries,
  today: string,
): Promise<void> {
  const oldIds = buildFutureOccurrenceIds(series, today);
  const { error } = await admin.rpc("delete_bulk_event_series", {
    p_id: series.id,
    p_expected_updated_at: series.updatedAt,
    p_old_content_ids: oldIds.contentIds,
    p_old_management_ids: oldIds.managementIds,
    p_today: today,
  });
  if (error) throwRpcError("No se pudo eliminar la serie", error);
}
