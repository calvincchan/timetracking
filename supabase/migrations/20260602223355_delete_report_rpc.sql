CREATE OR REPLACE FUNCTION public.delete_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot jsonb;
  v_entry_ids uuid[];
BEGIN
  IF NOT has_role_permission('reports:write') THEN
    RAISE EXCEPTION 'delete_report: insufficient permissions';
  END IF;

  SELECT time_entries_snapshot
  INTO v_snapshot
  FROM public.reports
  WHERE id = p_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'delete_report: report not found';
  END IF;

  SELECT array_agg((elem->>'entry_id')::uuid)
  INTO v_entry_ids
  FROM jsonb_array_elements(v_snapshot) elem;

  UPDATE public.time_entries
  SET is_locked = false
  WHERE id = ANY(v_entry_ids);

  DELETE FROM public.reports WHERE id = p_report_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_report(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_report(uuid) TO authenticated, service_role;
