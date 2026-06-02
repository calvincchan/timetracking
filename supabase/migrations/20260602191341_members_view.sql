-- Expose member roster (with email) to Supervisors via a security-definer view.
-- auth.users is accessible because the view is owned by postgres (migration owner).
-- has_role_permission() in WHERE clause restricts rows to callers with profiles:read.

CREATE OR REPLACE VIEW public.members AS
SELECT
  p.id,
  p.full_name,
  p.role,
  u.email,
  u.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE public.has_role_permission('profiles:read'::public.permissions);

ALTER VIEW public.members OWNER TO postgres;

GRANT SELECT ON public.members TO authenticated;
