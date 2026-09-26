begin;


-- ============================================================
-- 009D
-- SCHOOL YEAR + PROGRAM CALENDAR CONFIGURATION
--
-- school_years represents the umbrella administrative year.
--
-- program_calendar_periods represents the actual instructional
-- periods for Youth and Junior programs.
--
-- Dates are DATA, not application logic, so admins can configure
-- them when setting up each new school year.
-- ============================================================


-- ============================================================
-- 1. PROGRAM CALENDAR PERIODS
-- ============================================================

create table public.program_calendar_periods (

  id uuid primary key
    default gen_random_uuid(),

  school_year_id uuid not null
    references public.school_years(id)
    on delete cascade,

  program text not null,

  period text not null,

  label text not null,

  starts_on date not null,

  ends_on date not null,

  display_order integer not null
    default 0,

  is_active boolean not null
    default true,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint program_calendar_periods_program_check
    check (
      program in (
        'junior',
        'youth'
      )
    ),

  constraint program_calendar_periods_period_check
    check (
      (
        program = 'youth'
        and period in (
          'fall',
          'spring',
          'year_long'
        )
      )
      or
      (
        program = 'junior'
        and period in (
          'fall_session_1',
          'fall_session_2',
          'spring_session_1',
          'spring_session_2'
        )
      )
    ),

  constraint program_calendar_period_dates_valid
    check (
      ends_on >= starts_on
    ),

  constraint program_calendar_period_unique
    unique (
      school_year_id,
      program,
      period
    )
);


create index program_calendar_periods_year_program_idx
  on public.program_calendar_periods (
    school_year_id,
    program
  );


-- ============================================================
-- 2. UPDATED_AT TRIGGER
-- ============================================================

create trigger set_program_calendar_periods_updated_at

before update
on public.program_calendar_periods

for each row

execute function public.set_updated_at();


-- ============================================================
-- 3. RLS
--
-- Direct browser writes are intentionally not enabled yet.
--
-- The future Admin UI should use a controlled admin RPC rather
-- than allowing arbitrary table writes from the browser.
-- ============================================================

alter table public.program_calendar_periods
enable row level security;


revoke all
on table public.program_calendar_periods
from anon, authenticated;


-- ============================================================
-- 4. LOOKUP FUNCTION
--
-- Gives application/database functions one canonical way to
-- retrieve the configured period.
-- ============================================================

create or replace function public.get_program_calendar_period(
  p_school_year_id uuid,
  p_program text,
  p_period text
)
returns table (
  id uuid,
  school_year_id uuid,
  program text,
  period text,
  label text,
  starts_on date,
  ends_on date,
  display_order integer,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $function$

  select
    pcp.id,
    pcp.school_year_id,
    pcp.program,
    pcp.period,
    pcp.label,
    pcp.starts_on,
    pcp.ends_on,
    pcp.display_order,
    pcp.is_active

  from public.program_calendar_periods pcp

  where pcp.school_year_id =
        p_school_year_id

    and pcp.program =
        p_program

    and pcp.period =
        p_period

    and pcp.is_active = true;

$function$;


-- ============================================================
-- 5. INITIALIZE A NEW SCHOOL YEAR'S CALENDAR
--
-- Creates the expected period rows WITHOUT inventing dates.
--
-- Admins will supply dates when configuring the year.
--
-- Because starts_on/ends_on are required on finalized calendar
-- rows, this helper accepts the dates explicitly.
-- ============================================================

create or replace function public.initialize_program_calendar(
  p_school_year_id uuid,

  p_youth_fall_start date,
  p_youth_fall_end date,

  p_youth_spring_start date,
  p_youth_spring_end date,

  p_youth_year_long_start date,
  p_youth_year_long_end date,

  p_junior_fall_1_start date,
  p_junior_fall_1_end date,

  p_junior_fall_2_start date,
  p_junior_fall_2_end date,

  p_junior_spring_1_start date,
  p_junior_spring_1_end date,

  p_junior_spring_2_start date,
  p_junior_spring_2_end date
)
returns void
language plpgsql
security definer
set search_path = public
as $function$

begin

  if not exists (
    select 1
    from public.school_years sy
    where sy.id = p_school_year_id
  ) then

    raise exception
      'School year % does not exist.',
      p_school_year_id;

  end if;


  insert into public.program_calendar_periods (
    school_year_id,
    program,
    period,
    label,
    starts_on,
    ends_on,
    display_order
  )

  values

    (
      p_school_year_id,
      'youth',
      'fall',
      'Youth Fall',
      p_youth_fall_start,
      p_youth_fall_end,
      10
    ),

    (
      p_school_year_id,
      'youth',
      'spring',
      'Youth Spring',
      p_youth_spring_start,
      p_youth_spring_end,
      20
    ),

    (
      p_school_year_id,
      'youth',
      'year_long',
      'Youth Year Long',
      p_youth_year_long_start,
      p_youth_year_long_end,
      30
    ),

    (
      p_school_year_id,
      'junior',
      'fall_session_1',
      'Junior Fall Session 1',
      p_junior_fall_1_start,
      p_junior_fall_1_end,
      10
    ),

    (
      p_school_year_id,
      'junior',
      'fall_session_2',
      'Junior Fall Session 2',
      p_junior_fall_2_start,
      p_junior_fall_2_end,
      20
    ),

    (
      p_school_year_id,
      'junior',
      'spring_session_1',
      'Junior Spring Session 1',
      p_junior_spring_1_start,
      p_junior_spring_1_end,
      30
    ),

    (
      p_school_year_id,
      'junior',
      'spring_session_2',
      'Junior Spring Session 2',
      p_junior_spring_2_start,
      p_junior_spring_2_end,
      40
    )

  on conflict (
    school_year_id,
    program,
    period
  )

  do update set

    label =
      excluded.label,

    starts_on =
      excluded.starts_on,

    ends_on =
      excluded.ends_on,

    display_order =
      excluded.display_order,

    is_active =
      true;

end;

$function$;


-- ============================================================
-- 6. SERVICE-ROLE ONLY CONFIGURATION
--
-- Eventually an Admin RPC will check the authenticated person's
-- admin role and call/update this configuration safely.
-- ============================================================

revoke all
on function public.initialize_program_calendar(
  uuid,
  date, date,
  date, date,
  date, date,
  date, date,
  date, date,
  date, date,
  date, date
)
from public, anon, authenticated;


grant execute
on function public.initialize_program_calendar(
  uuid,
  date, date,
  date, date,
  date, date,
  date, date,
  date, date,
  date, date,
  date, date
)
to service_role;


grant execute
on function public.get_program_calendar_period(
  uuid,
  text,
  text
)
to authenticated, service_role;


-- ============================================================
-- 7. SEED 2026-2027
-- ============================================================

do $seed$

declare
  v_year_id uuid;

begin

  select id
  into v_year_id

  from public.school_years

  where name = '2026-2027';


  if v_year_id is null then

    raise exception
      'Cannot seed program calendar: school year 2026-2027 does not exist.';

  end if;


  perform public.initialize_program_calendar(

    v_year_id,

    -- Youth Fall
    '2026-08-24'::date,
    '2026-12-04'::date,

    -- Youth Spring
    '2027-01-11'::date,
    '2027-04-22'::date,

    -- Youth Year Long
    '2026-08-24'::date,
    '2027-04-22'::date,

    -- Junior Fall Session 1
    '2026-08-31'::date,
    '2026-10-08'::date,

    -- Junior Fall Session 2
    '2026-10-19'::date,
    '2026-11-19'::date,

    -- Junior Spring Session 1
    '2027-01-18'::date,
    '2027-02-25'::date,

    -- Junior Spring Session 2
    '2027-03-08'::date,
    '2027-04-15'::date

  );

end;

$seed$;


-- ============================================================
-- 8. DOCUMENT THE RELATIONSHIP TO CLASS OFFERINGS
--
-- class_offerings.starts_on / ends_on remain useful.
--
-- They represent the actual dates for a specific offering.
--
-- program_calendar_periods represents the STANDARD program
-- calendar configured by admins for the year.
--
-- This allows an individual offering to differ when necessary
-- without changing the entire program calendar.
-- ============================================================

comment on table public.program_calendar_periods is
'Admin-configured instructional periods for each program and school year. These are standard calendar dates; individual class offerings may have their own actual starts_on and ends_on dates.';


comment on column public.school_years.starts_on is
'Umbrella administrative school-year start. Program instructional dates are stored in program_calendar_periods.';


comment on column public.school_years.ends_on is
'Umbrella administrative school-year end. Program instructional dates are stored in program_calendar_periods.';


commit;