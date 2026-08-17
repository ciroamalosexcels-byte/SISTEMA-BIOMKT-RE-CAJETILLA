CREATE TABLE IF NOT EXISTS public.bulk_event_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('content', 'management')),
  title text NOT NULL,
  event_type text NOT NULL,
  client_ids uuid[] NOT NULL,
  day_of_month smallint NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  event_time text NOT NULL DEFAULT '',
  start_month text NOT NULL CHECK (start_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  recurrence text NOT NULL CHECK (recurrence IN ('once', 'count', 'monthly')),
  repeat_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bulk_event_series_repeat_count_check CHECK (
    repeat_count BETWEEN 0 AND 120
    AND (
      (recurrence = 'count' AND repeat_count >= 1)
      OR (recurrence IN ('once', 'monthly') AND repeat_count = 0)
    )
  )
);

ALTER TABLE public.bulk_event_series
  DROP CONSTRAINT IF EXISTS bulk_event_series_repeat_count_check;
ALTER TABLE public.bulk_event_series
  ADD CONSTRAINT bulk_event_series_repeat_count_check CHECK (
    repeat_count BETWEEN 0 AND 120
    AND (
      (recurrence = 'count' AND repeat_count >= 1)
      OR (recurrence IN ('once', 'monthly') AND repeat_count = 0)
    )
  );

ALTER TABLE public.bulk_event_series ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.bulk_event_series FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bulk_event_series TO service_role;

CREATE OR REPLACE FUNCTION public.create_bulk_event_series(
  p_series jsonb,
  p_content_rows jsonb,
  p_management_rows jsonb
)
RETURNS public.bulk_event_series
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_input public.bulk_event_series;
  v_created public.bulk_event_series;
BEGIN
  IF jsonb_typeof(p_content_rows) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_management_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Concrete event payloads must be JSON arrays';
  END IF;

  SELECT * INTO v_input
  FROM jsonb_populate_record(NULL::public.bulk_event_series, p_series);

  INSERT INTO public.bulk_event_series (
    id,
    kind,
    title,
    event_type,
    client_ids,
    day_of_month,
    event_time,
    start_month,
    recurrence,
    repeat_count
  ) VALUES (
    v_input.id,
    v_input.kind,
    v_input.title,
    v_input.event_type,
    v_input.client_ids,
    v_input.day_of_month,
    v_input.event_time,
    v_input.start_month,
    v_input.recurrence,
    v_input.repeat_count
  )
  RETURNING * INTO v_created;

  IF v_created.kind = 'content' THEN
    IF jsonb_array_length(p_management_rows) <> 0 THEN
      RAISE EXCEPTION 'Management rows do not belong to a content series';
    END IF;

    INSERT INTO public.content_events (
      id,
      client_id,
      title,
      type,
      status,
      scheduled_date,
      done,
      timer_seconds,
      timer_running,
      timer_started_at,
      event_order
    )
    SELECT
      event_row.id,
      event_row.client_id,
      event_row.title,
      event_row.type,
      event_row.status,
      event_row.scheduled_date,
      event_row.done,
      event_row.timer_seconds,
      event_row.timer_running,
      event_row.timer_started_at,
      event_row.event_order
    FROM jsonb_populate_recordset(NULL::public.content_events, p_content_rows) AS event_row
    ON CONFLICT (id) DO NOTHING;
  ELSE
    IF jsonb_array_length(p_content_rows) <> 0 THEN
      RAISE EXCEPTION 'Content rows do not belong to a management series';
    END IF;

    INSERT INTO public.management_events (id, client_id, title, type, datetime, done)
    SELECT
      event_row.id,
      event_row.client_id,
      event_row.title,
      event_row.type,
      event_row.datetime,
      event_row.done
    FROM jsonb_populate_recordset(NULL::public.management_events, p_management_rows) AS event_row
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN v_created;
END;
$function$;

CREATE OR REPLACE FUNCTION public.materialize_bulk_event_series(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_content_rows jsonb,
  p_management_rows jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_current public.bulk_event_series;
BEGIN
  IF jsonb_typeof(p_content_rows) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_management_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Concrete event payloads must be JSON arrays';
  END IF;

  SELECT * INTO v_current
  FROM public.bulk_event_series
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND OR v_current.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RETURN false;
  END IF;

  IF v_current.kind = 'content' THEN
    IF jsonb_array_length(p_management_rows) <> 0 THEN
      RAISE EXCEPTION 'Management rows do not belong to a content series';
    END IF;

    INSERT INTO public.content_events (
      id,
      client_id,
      title,
      type,
      status,
      scheduled_date,
      done,
      timer_seconds,
      timer_running,
      timer_started_at,
      event_order
    )
    SELECT
      event_row.id,
      event_row.client_id,
      event_row.title,
      event_row.type,
      event_row.status,
      event_row.scheduled_date,
      event_row.done,
      event_row.timer_seconds,
      event_row.timer_running,
      event_row.timer_started_at,
      event_row.event_order
    FROM jsonb_populate_recordset(NULL::public.content_events, p_content_rows) AS event_row
    ON CONFLICT (id) DO NOTHING;
  ELSE
    IF jsonb_array_length(p_content_rows) <> 0 THEN
      RAISE EXCEPTION 'Content rows do not belong to a management series';
    END IF;

    INSERT INTO public.management_events (id, client_id, title, type, datetime, done)
    SELECT
      event_row.id,
      event_row.client_id,
      event_row.title,
      event_row.type,
      event_row.datetime,
      event_row.done
    FROM jsonb_populate_recordset(NULL::public.management_events, p_management_rows) AS event_row
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_bulk_event_series(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_series jsonb,
  p_old_content_ids uuid[],
  p_old_management_ids uuid[],
  p_today date,
  p_content_rows jsonb,
  p_management_rows jsonb
)
RETURNS public.bulk_event_series
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_current public.bulk_event_series;
  v_input public.bulk_event_series;
  v_updated public.bulk_event_series;
BEGIN
  IF jsonb_typeof(p_content_rows) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_management_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Concrete event payloads must be JSON arrays';
  END IF;

  SELECT * INTO v_current
  FROM public.bulk_event_series
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND OR v_current.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'BULK_EVENT_SERIES_CONFLICT: stale or deleted series'
      USING ERRCODE = '40001';
  END IF;

  DELETE FROM public.content_events
  WHERE id = ANY(p_old_content_ids)
    AND scheduled_date::date >= p_today;

  DELETE FROM public.management_events
  WHERE id = ANY(p_old_management_ids)
    AND datetime::date >= p_today;

  SELECT * INTO v_input
  FROM jsonb_populate_record(NULL::public.bulk_event_series, p_series);

  UPDATE public.bulk_event_series
  SET
    kind = v_input.kind,
    title = v_input.title,
    event_type = v_input.event_type,
    client_ids = v_input.client_ids,
    day_of_month = v_input.day_of_month,
    event_time = v_input.event_time,
    start_month = v_input.start_month,
    recurrence = v_input.recurrence,
    repeat_count = v_input.repeat_count,
    updated_at = clock_timestamp()
  WHERE id = p_id
  RETURNING * INTO v_updated;

  IF v_updated.kind = 'content' THEN
    IF jsonb_array_length(p_management_rows) <> 0 THEN
      RAISE EXCEPTION 'Management rows do not belong to a content series';
    END IF;

    INSERT INTO public.content_events (
      id,
      client_id,
      title,
      type,
      status,
      scheduled_date,
      done,
      timer_seconds,
      timer_running,
      timer_started_at,
      event_order
    )
    SELECT
      event_row.id,
      event_row.client_id,
      event_row.title,
      event_row.type,
      event_row.status,
      event_row.scheduled_date,
      event_row.done,
      event_row.timer_seconds,
      event_row.timer_running,
      event_row.timer_started_at,
      event_row.event_order
    FROM jsonb_populate_recordset(NULL::public.content_events, p_content_rows) AS event_row
    ON CONFLICT (id) DO NOTHING;
  ELSE
    IF jsonb_array_length(p_content_rows) <> 0 THEN
      RAISE EXCEPTION 'Content rows do not belong to a management series';
    END IF;

    INSERT INTO public.management_events (id, client_id, title, type, datetime, done)
    SELECT
      event_row.id,
      event_row.client_id,
      event_row.title,
      event_row.type,
      event_row.datetime,
      event_row.done
    FROM jsonb_populate_recordset(NULL::public.management_events, p_management_rows) AS event_row
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN v_updated;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_bulk_event_series(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_old_content_ids uuid[],
  p_old_management_ids uuid[],
  p_today date
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_current public.bulk_event_series;
BEGIN
  SELECT * INTO v_current
  FROM public.bulk_event_series
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND OR v_current.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'BULK_EVENT_SERIES_CONFLICT: stale or deleted series'
      USING ERRCODE = '40001';
  END IF;

  DELETE FROM public.content_events
  WHERE id = ANY(p_old_content_ids)
    AND scheduled_date::date >= p_today;

  DELETE FROM public.management_events
  WHERE id = ANY(p_old_management_ids)
    AND datetime::date >= p_today;

  DELETE FROM public.bulk_event_series WHERE id = p_id;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_bulk_event_series(jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.materialize_bulk_event_series(uuid, timestamptz, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_bulk_event_series(
  uuid, timestamptz, jsonb, uuid[], uuid[], date, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_bulk_event_series(uuid, timestamptz, uuid[], uuid[], date)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_bulk_event_series(jsonb, jsonb, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.materialize_bulk_event_series(uuid, timestamptz, jsonb, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.update_bulk_event_series(
  uuid, timestamptz, jsonb, uuid[], uuid[], date, jsonb, jsonb
) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_bulk_event_series(uuid, timestamptz, uuid[], uuid[], date)
  TO service_role;
