begin;

-- ============================================================
-- 2026-2027 SCHOOL YEAR
-- ============================================================

insert into public.school_years (
  name,
  starts_on,
  ends_on,
  is_current
)
values (
  '2026-2027',
  '2026-08-24',
  '2027-04-22',
  true
)
on conflict (name)
do update set
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  is_current = excluded.is_current,
  updated_at = now();


-- ============================================================
-- REGISTRATION PROGRAM RULES
--
-- Junior:
--   No automatic classes.
--   Approved Youth contribution -> 2 classes/student
--   Full Junior contribution coverage -> unlimited
--
-- Youth:
--   Requires qualifying approved Youth contribution.
--
-- The dynamic contribution logic lives in
-- get_household_registration_status().
-- ============================================================

insert into public.registration_program_rules (
  school_year_id,
  program,
  base_class_limit,
  requires_contribution_to_register
)
select
  sy.id,
  rules.program,
  rules.base_class_limit,
  rules.requires_contribution
from public.school_years sy
cross join (
  values
    ('junior'::text, 0::integer, true),
    ('youth'::text, null::integer, true)
) as rules (
  program,
  base_class_limit,
  requires_contribution
)
where sy.name = '2026-2027'
on conflict (school_year_id, program)
do update set
  base_class_limit =
    excluded.base_class_limit,
  requires_contribution_to_register =
    excluded.requires_contribution_to_register,
  updated_at = now();

commit;