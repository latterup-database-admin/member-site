begin;


-- ============================================================
-- 009E
-- OPERATIONAL CALENDAR
--
-- Stores configurable operational dates associated with a
-- school year and, optionally, a specific program period.
--
-- Examples:
--   - Classroom student provisioning
--   - Registration deadlines
--   - Payment/enrollment cutoffs
--   - Catalog dates
--
-- These are intentionally separate from instructional dates.
-- ============================================================


-- ============================================================
-- 1. OPERATIONAL CALENDAR EVENTS
-- ============================================================

create table public.operational_calendar_events (

  id uuid primary key
    default gen_random_uuid(),

  school_year_id uuid not null
    references public.school_years(id)
    on delete cascade,

  program_calendar_period_id uuid
    references public.program_calendar_periods(id)
    on delete cascade,

  event_type text not null,

  event_date date not null,

  label text not null,

  notes text,

  is_active boolean not null
    default true,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint operational_calendar_event_type_check
    check (
      event_type in (
        'classroom_student_provisioning',
        'registration_opens',
        'registration_closes',
        'payment_cutoff',
        'enrollment_cutoff',
        'catalog_opens',
        'catalog_closes',
        'custom'
      )
    ),

  constraint operational_calendar_period_event_unique
    unique (
      program_calendar_period_id,
      event_type
    )
);


create index operational_calendar_events_year_idx
  on public.operational_calendar_events (
    school_year_id
  );


create index operational_calendar_events_period_idx
  on public.operational_calendar_events (
    program_calendar_period_id
  );


create index operational_calendar_events_date_idx
  on public.operational_calendar_events (
    event_date
  );


-- ============================================================
-- 2. KEEP SCHOOL YEAR / PERIOD CONSISTENT
--
-- If an event references a program period, that period must
-- belong to the same school year as the event.
-- ============================================================

create or replace function public.validate_operational_calendar_event()
returns trigger
language plpgsql
set search_path = public
as $function$

declare
  v_period_year_id uuid;

begin

  if new.program_calendar_period_id is null then
    return new;
  end if;


  select pcp.school_year_id
  into v_period_year_id

  from public.program_calendar_periods pcp

  where pcp.id =
        new.program_calendar_period_id;


  if v_period_year_id is null then

    raise exception
      'Program calendar period % does not exist.',
      new.program_calendar_period_id;

  end if;


  if v_period_year_id <> new.school_year_id then

    raise exception
      'Operational event school year must match its program calendar period school year.';

  end if;


  return new;

end;

$function$;


create trigger validate_operational_calendar_event_trigger

before insert or update
on public.operational_calendar_events

for each row

execute function public.validate_operational_calendar_event();


-- ============================================================
-- 3. UPDATED_AT
-- ============================================================

create trigger set_operational_calendar_events_updated_at

before update
on public.operational_calendar_events

for each row

execute function public.set_updated_at();


-- ============================================================
-- 4. RLS
--
-- Configuration should not be directly writable by ordinary
-- authenticated browser sessions.
-- ============================================================

alter table public.operational_calendar_events
enable row level security;


revoke all
on table public.operational_calendar_events
from anon, authenticated;


-- ============================================================
-- 5. EVENT LOOKUP
--
-- Canonical helper for application/database logic.
-- ============================================================

create or replace function public.get_operational_calendar_event(
  p_school_year_id uuid,
  p_program text,
  p_period text,
  p_event_type text
)
returns table (
  event_id uuid,
  event_date date,
  label text,
  notes text
)
language sql
stable
security definer
set search_path = public
as $function$

  select
    oce.id,
    oce.event_date,
    oce.label,
    oce.notes

  from public.operational_calendar_events oce

  join public.program_calendar_periods pcp
    on pcp.id =
       oce.program_calendar_period_id

  where oce.school_year_id =
        p_school_year_id

    and pcp.program =
        p_program

    and pcp.period =
        p_period

    and pcp.is_active = true

    and oce.event_type =
        p_event_type

    and oce.is_active = true;

$function$;


-- ============================================================
-- 6. CLASSROOM PROVISIONING DATE HELPER
-- ============================================================

create or replace function public.get_classroom_provisioning_date(
  p_school_year_id uuid,
  p_program text,
  p_period text
)
returns date
language sql
stable
security definer
set search_path = public
as $function$

  select oce.event_date

  from public.operational_calendar_events oce

  join public.program_calendar_periods pcp
    on pcp.id =
       oce.program_calendar_period_id

  where oce.school_year_id =
        p_school_year_id

    and pcp.program =
        p_program

    and pcp.period =
        p_period

    and pcp.is_active = true

    and oce.event_type =
        'classroom_student_provisioning'

    and oce.is_active = true

  limit 1;

$function$;


-- ============================================================
-- 7. CLASSROOM PERIOD READINESS
--
-- This answers only:
--
--   "Has the configured provisioning date arrived?"
--
-- It deliberately does NOT mean:
--
--   "This student should be added to Classroom."
--
-- Student-specific readiness will additionally require:
--   - an active enrollment
--   - an appropriate Workspace account
--   - financial clearance
--   - desired Classroom membership
--
-- Those belong in the Google sync layer.
-- ============================================================

create or replace function public.classroom_period_is_ready(
  p_school_year_id uuid,
  p_program text,
  p_period text,
  p_as_of_date date default current_date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$

  select coalesce(
    (
      select
        p_as_of_date >= oce.event_date

      from public.operational_calendar_events oce

      join public.program_calendar_periods pcp
        on pcp.id =
           oce.program_calendar_period_id

      where oce.school_year_id =
            p_school_year_id

        and pcp.program =
            p_program

        and pcp.period =
            p_period

        and pcp.is_active = true

        and oce.event_type =
            'classroom_student_provisioning'

        and oce.is_active = true

      limit 1
    ),
    false
  );

$function$;


-- ============================================================
-- 8. CONFIGURATION UPSERT
--
-- Service-side/admin tooling can use this rather than directly
-- manipulating rows.
-- ============================================================

create or replace function public.set_operational_calendar_event(
  p_school_year_id uuid,
  p_program text,
  p_period text,
  p_event_type text,
  p_event_date date,
  p_label text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_period_id uuid;
  v_event_id uuid;

begin

  select pcp.id
  into v_period_id

  from public.program_calendar_periods pcp

  where pcp.school_year_id =
        p_school_year_id

    and pcp.program =
        p_program

    and pcp.period =
        p_period;


  if v_period_id is null then

    raise exception
      'Program period %.% does not exist for school year %.',
      p_program,
      p_period,
      p_school_year_id;

  end if;


  insert into public.operational_calendar_events (
    school_year_id,
    program_calendar_period_id,
    event_type,
    event_date,
    label,
    notes,
    is_active
  )

  values (
    p_school_year_id,
    v_period_id,
    p_event_type,
    p_event_date,
    p_label,
    p_notes,
    true
  )

  on conflict (
    program_calendar_period_id,
    event_type
  )

  do update set

    school_year_id =
      excluded.school_year_id,

    event_date =
      excluded.event_date,

    label =
      excluded.label,

    notes =
      excluded.notes,

    is_active =
      true

  returning id
  into v_event_id;


  return v_event_id;

end;

$function$;


-- ============================================================
-- 9. PERMISSIONS
-- ============================================================

revoke all
on function public.set_operational_calendar_event(
  uuid,
  text,
  text,
  text,
  date,
  text,
  text
)
from public, anon, authenticated;


grant execute
on function public.set_operational_calendar_event(
  uuid,
  text,
  text,
  text,
  date,
  text,
  text
)
to service_role;


grant execute
on function public.get_operational_calendar_event(
  uuid,
  text,
  text,
  text
)
to authenticated, service_role;


grant execute
on function public.get_classroom_provisioning_date(
  uuid,
  text,
  text
)
to authenticated, service_role;


grant execute
on function public.classroom_period_is_ready(
  uuid,
  text,
  text,
  date
)
to authenticated, service_role;


-- ============================================================
-- 10. SEED 2026-2027 CLASSROOM PROVISIONING DATES
-- ============================================================

do $seed$

declare
  v_year_id uuid;

begin

  select sy.id
  into v_year_id

  from public.school_years sy

  where sy.name =
        '2026-2027';


  if v_year_id is null then

    raise exception
      'Cannot seed operational calendar: school year 2026-2027 does not exist.';

  end if;


  -- Youth Fall
  perform public.set_operational_calendar_event(
    v_year_id,
    'youth',
    'fall',
    'classroom_student_provisioning',
    '2026-08-17'::date,
    'Youth Fall Classroom Student Provisioning',
    'Configured one week before Youth Fall classes begin.'
  );


  -- Youth Spring
  perform public.set_operational_calendar_event(
    v_year_id,
    'youth',
    'spring',
    'classroom_student_provisioning',
    '2027-01-04'::date,
    'Youth Spring Classroom Student Provisioning',
    'Configured one week before Youth Spring classes begin.'
  );


  -- Youth Year Long
  perform public.set_operational_calendar_event(
    v_year_id,
    'youth',
    'year_long',
    'classroom_student_provisioning',
    '2026-08-17'::date,
    'Youth Year Long Classroom Student Provisioning',
    'Configured one week before Youth Year Long classes begin.'
  );


  -- Junior Fall Session 1
  perform public.set_operational_calendar_event(
    v_year_id,
    'junior',
    'fall_session_1',
    'classroom_student_provisioning',
    '2026-08-24'::date,
    'Junior Fall Session 1 Classroom Student Provisioning',
    'Configured one week before Junior Fall Session 1 begins.'
  );


  -- Junior Fall Session 2
  perform public.set_operational_calendar_event(
    v_year_id,
    'junior',
    'fall_session_2',
    'classroom_student_provisioning',
    '2026-10-12'::date,
    'Junior Fall Session 2 Classroom Student Provisioning',
    'Configured one week before Junior Fall Session 2 begins.'
  );


  -- Junior Spring Session 1
  perform public.set_operational_calendar_event(
    v_year_id,
    'junior',
    'spring_session_1',
    'classroom_student_provisioning',
    '2027-01-11'::date,
    'Junior Spring Session 1 Classroom Student Provisioning',
    'Configured one week before Junior Spring Session 1 begins.'
  );


  -- Junior Spring Session 2
  perform public.set_operational_calendar_event(
    v_year_id,
    'junior',
    'spring_session_2',
    'classroom_student_provisioning',
    '2027-03-01'::date,
    'Junior Spring Session 2 Classroom Student Provisioning',
    'Configured one week before Junior Spring Session 2 begins.'
  );

end;

$seed$;


-- ============================================================
-- 11. DOCUMENTATION
-- ============================================================

comment on table public.operational_calendar_events is
'Admin-configured operational dates for a school year, optionally associated with a program calendar period. Operational dates are stored explicitly rather than inferred from instructional dates.';


comment on function public.classroom_period_is_ready(
  uuid,
  text,
  text,
  date
) is
'Returns whether the configured Classroom student provisioning date has arrived for a program period. Does not evaluate student-specific enrollment, Workspace, financial, or desired-roster readiness.';


commit;