begin;

-- ============================================================
-- STUDENT / GUARDIAN ACCESS SECURITY HOUSEKEEPING
-- ============================================================

alter table public.student_guardian_access
  enable row level security;


-- Keep updated_at accurate automatically.

drop trigger if exists
  set_student_guardian_access_updated_at
on public.student_guardian_access;

create trigger
  set_student_guardian_access_updated_at
before update
on public.student_guardian_access
for each row
execute function public.set_updated_at();


-- No browser-facing RLS policies are intentionally added yet.
--
-- Access to this table will be exposed through narrowly scoped
-- helper/RPC functions when we replace the old household-wide
-- can_manage_household registration authorization.
--
-- Until then, enabling RLS prevents the table from accidentally
-- becoming directly readable/writable through the API.

commit;