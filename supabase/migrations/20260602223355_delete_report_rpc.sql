CREATE OR REPLACE FUNCTION public.delete_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_ids uuid[];
BEGIN
  IF (auth.jwt() ->> 'user_role') IS DISTINCT FROM 'Supervisor' THEN
    RAISE EXCEPTION 'delete_report: insufficient permissions';
  END IF;

  SELECT array_agg((elem->>'entry_id')::uuid)
  INTO v_entry_ids
  FROM jsonb_array_elements(
    (SELECT time_entries_snapshot FROM public.reports WHERE id = p_report_id)
  ) elem;

  UPDATE public.time_entries
  SET is_locked = false
  WHERE id = ANY(v_entry_ids);

  DELETE FROM public.reports WHERE id = p_report_id;
END;
$$;
