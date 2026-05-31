-- =============================================================================
-- report_rpcs.sql — preview_report and generate_report RPCs
-- =============================================================================

-- preview_report: returns entry_count and member_count for unlocked entries
-- matching the given period and optional filters. SECURITY INVOKER — callers
-- must have reports:read (enforced by the calling client, not here).
-- Members see only their own entries via time_entries RLS; Supervisors see all.
CREATE OR REPLACE FUNCTION public.preview_report(
    period_start  date,
    period_end    date,
    user_id       uuid DEFAULT NULL,
    category_id   uuid DEFAULT NULL
)
RETURNS TABLE (entry_count int, member_count int)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::int                   AS entry_count,
        COUNT(DISTINCT te.user_id)::int AS member_count
    FROM public.time_entries te
    WHERE te.is_locked = false
      AND te.entry_date >= period_start
      AND te.entry_date <= period_end
      AND (preview_report.user_id     IS NULL OR te.user_id     = preview_report.user_id)
      AND (preview_report.category_id IS NULL OR te.category_id = preview_report.category_id);
END;
$$;

-- generate_report: atomically locks matching unlocked entries, enriches each
-- with user_full_name and category_name, inserts a reports row with the
-- snapshot, and marks entries locked. Returns the new report's id.
-- Raises an exception when zero entries match the filters.
-- FOR UPDATE on the inner subquery serializes concurrent calls: the second
-- caller blocks until the first transaction commits, then finds no unlocked
-- entries and raises.
CREATE OR REPLACE FUNCTION public.generate_report(
    period_start  date,
    period_end    date,
    user_id       uuid DEFAULT NULL,
    category_id   uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_report_id   uuid;
    v_snapshot    jsonb;
    v_ids         uuid[];
BEGIN
    -- Lock matching unlocked entries (FOR UPDATE in subquery; aggregate disallowed directly)
    SELECT array_agg(id)
    INTO v_ids
    FROM (
        SELECT te.id
        FROM public.time_entries te
        WHERE te.is_locked = false
          AND te.entry_date >= period_start
          AND te.entry_date <= period_end
          AND (generate_report.user_id     IS NULL OR te.user_id     = generate_report.user_id)
          AND (generate_report.category_id IS NULL OR te.category_id = generate_report.category_id)
        FOR UPDATE OF te
    ) locked;

    IF v_ids IS NULL THEN
        RAISE EXCEPTION 'generate_report: no unlocked entries match the given filters';
    END IF;

    -- Build enriched snapshot from the now-locked entries
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'entry_id',         te.id,
                'user_id',          te.user_id,
                'user_full_name',   p.full_name,
                'entry_date',       te.entry_date,
                'duration_minutes', te.duration_minutes,
                'category_id',      te.category_id,
                'category_name',    COALESCE(c.name, ''),
                'note',             te.note
            )
            ORDER BY te.entry_date, te.user_id
        )
    INTO v_snapshot
    FROM public.time_entries te
    JOIN public.profiles p ON p.id = te.user_id
    LEFT JOIN public.categories c ON c.id = te.category_id
    WHERE te.id = ANY(v_ids);

    -- Insert report row
    INSERT INTO public.reports (generated_by, period_start, period_end, time_entries_snapshot)
    VALUES (auth.uid(), period_start, period_end, v_snapshot)
    RETURNING id INTO v_report_id;

    -- Mark entries locked
    UPDATE public.time_entries
    SET is_locked = true
    WHERE id = ANY(v_ids);

    RETURN v_report_id;
END;
$$;

-- Grant execute to authenticated users (RLS on reports table enforces access control)
GRANT EXECUTE ON FUNCTION public.preview_report(date, date, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_report(date, date, uuid, uuid) TO authenticated;

-- Explicitly revoke from anon; db-refresh.sh schema dump includes anon by default
REVOKE EXECUTE ON FUNCTION public.preview_report(date, date, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_report(date, date, uuid, uuid) FROM anon;
